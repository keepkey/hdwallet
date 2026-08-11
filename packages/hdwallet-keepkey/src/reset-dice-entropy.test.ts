/**
 * Unit tests for the dice-entropy flag on KeepKeyHDWallet.reset().
 *
 * `diceEntropy` asks the device to collect dice rolls with its own button and
 * fold them into the internal entropy before the seed is committed. The rolls
 * never reach the host — that is the point, since desktop-entered dice only
 * help while the device's own randomness stays secret.
 *
 * Two properties are load-bearing, and both are security properties:
 *
 *  1. The field is left ABSENT unless requested, so the message stays
 *     byte-identical to today's for every caller that does not ask for dice.
 *
 *  2. Requesting it against firmware that cannot honour it FAILS, rather than
 *     silently producing an ordinary RNG-only wallet. Firmware before v7.15.0
 *     has no dice_entropy field, and nanopb SKIPS unknown fields rather than
 *     rejecting them (lib/transport/pb_decode.c:904, "No match found, skip
 *     data" — verified identical on v7.14.1). So the naive "just set it, old
 *     firmware will reject it" assumption is wrong: the reset would succeed
 *     and the caller would believe dice entropy was used when it was not.
 */
import * as Messages from "@keepkey/device-protocol/lib/messages_pb";

import { KeepKeyHDWallet } from "./keepkey";

/**
 * Mock transport that answers GetFeatures with a chosen firmware version and
 * accepts anything else. `features: null` simulates a device whose Features
 * carry no version fields.
 */
function makeMockTransport(opts: { major?: number; minor?: number; patch?: number; features?: null } = {}) {
  const { major = 7, minor = 15, patch = 0 } = opts;
  const featuresMessage =
    opts.features === null
      ? { deviceId: "mock-device-id" }
      : { deviceId: "mock-device-id", majorVersion: major, minorVersion: minor, patchVersion: patch };

  return {
    debugLink: false,
    call: jest.fn().mockImplementation((messageType: number) => {
      if (messageType === Messages.MessageType.MESSAGETYPE_GETFEATURES) {
        return Promise.resolve({ message_type: "Features", message: featuresMessage });
      }
      return Promise.resolve({ message_type: "Success", message: {} });
    }),
    getDeviceID: jest.fn().mockResolvedValue("mock-device-id"),
    keyring: { addAlias: jest.fn() },
  } as any;
}

/** The ResetDevice protobuf the wallet handed to the transport, if any. */
function sentResetDevice(transport: any): Messages.ResetDevice {
  const call = transport.call.mock.calls.find((c: any[]) => c[0] === Messages.MessageType.MESSAGETYPE_RESETDEVICE);
  expect(call).toBeDefined();
  return call[1] as Messages.ResetDevice;
}

function resetWasSent(transport: any): boolean {
  return transport.call.mock.calls.some((c: any[]) => c[0] === Messages.MessageType.MESSAGETYPE_RESETDEVICE);
}

const BASE_RESET = { entropy: 128, label: "test", pin: true, passphrase: false } as const;

describe("KeepKeyHDWallet.reset() dice entropy", () => {
  it("sets dice_entropy when requested on supporting firmware", async () => {
    const transport = makeMockTransport({ minor: 15 });
    await new KeepKeyHDWallet(transport).reset({ ...BASE_RESET, diceEntropy: true });

    const sent = sentResetDevice(transport);
    expect(sent.hasDiceEntropy()).toBe(true);
    expect(sent.getDiceEntropy()).toBe(true);
  });

  it("leaves dice_entropy ABSENT when diceEntropy is omitted", async () => {
    const transport = makeMockTransport();
    await new KeepKeyHDWallet(transport).reset({ ...BASE_RESET });

    expect(sentResetDevice(transport).hasDiceEntropy()).toBe(false);
  });

  it("leaves dice_entropy ABSENT when diceEntropy is explicitly false", async () => {
    const transport = makeMockTransport();
    await new KeepKeyHDWallet(transport).reset({ ...BASE_RESET, diceEntropy: false });

    expect(sentResetDevice(transport).hasDiceEntropy()).toBe(false);
  });

  it("serializes without the field when absent, and with it when set", async () => {
    // Round-trip through the wire format: "present but false" is not the same
    // as absent, and only absent leaves old firmware's parse unchanged.
    const off = makeMockTransport();
    await new KeepKeyHDWallet(off).reset({ ...BASE_RESET });
    expect(Messages.ResetDevice.deserializeBinary(sentResetDevice(off).serializeBinary()).hasDiceEntropy()).toBe(false);

    const on = makeMockTransport({ minor: 15 });
    await new KeepKeyHDWallet(on).reset({ ...BASE_RESET, diceEntropy: true });
    const withDice = Messages.ResetDevice.deserializeBinary(sentResetDevice(on).serializeBinary());
    expect(withDice.hasDiceEntropy()).toBe(true);
    expect(withDice.getDiceEntropy()).toBe(true);
  });

  it("still populates the other reset fields when dice entropy is on", async () => {
    const transport = makeMockTransport({ minor: 15 });
    await new KeepKeyHDWallet(transport).reset({
      entropy: 256,
      label: "dice wallet",
      pin: true,
      passphrase: true,
      diceEntropy: true,
    });

    const sent = sentResetDevice(transport);
    expect(sent.getStrength()).toBe(256);
    expect(sent.getLabel()).toBe("dice wallet");
    expect(sent.getPinProtection()).toBe(true);
    expect(sent.getPassphraseProtection()).toBe(true);
    expect(sent.getDisplayRandom()).toBe(false);
  });
});

describe("KeepKeyHDWallet.reset() refuses a silent dice downgrade", () => {
  // The regression this whole gate exists for. Old firmware does not reject
  // dice_entropy — it skips it — so without the gate the wallet is created
  // with RNG-only entropy and nobody is told.
  it("throws instead of resetting when firmware predates v7.15.0", async () => {
    const transport = makeMockTransport({ minor: 14, patch: 1 });

    await expect(new KeepKeyHDWallet(transport).reset({ ...BASE_RESET, diceEntropy: true })).rejects.toThrow(
      /Dice entropy requires KeepKey firmware v7\.15\.0 or later/
    );
    // The critical assertion: nothing was sent. A thrown error after a
    // successful reset would still have created an RNG-only wallet.
    expect(resetWasSent(transport)).toBe(false);
  });

  it("names the offending firmware version in the error", async () => {
    const transport = makeMockTransport({ major: 7, minor: 14, patch: 1 });
    const err = await new KeepKeyHDWallet(transport).reset({ ...BASE_RESET, diceEntropy: true }).catch((e: any) => e);

    expect(String(err.message)).toContain("v7.14.1");
  });

  it("fails closed when the firmware version is unreadable", async () => {
    const transport = makeMockTransport({ features: null });

    await expect(new KeepKeyHDWallet(transport).reset({ ...BASE_RESET, diceEntropy: true })).rejects.toThrow(
      /Dice entropy requires KeepKey firmware/
    );
    expect(resetWasSent(transport)).toBe(false);
  });

  it("still resets normally on old firmware when dice entropy is not requested", async () => {
    // The gate must not become a general old-firmware block.
    const transport = makeMockTransport({ minor: 14, patch: 1 });
    await new KeepKeyHDWallet(transport).reset({ ...BASE_RESET });

    expect(resetWasSent(transport)).toBe(true);
    expect(sentResetDevice(transport).hasDiceEntropy()).toBe(false);
  });
});

describe("KeepKeyHDWallet.supportsDiceEntropy()", () => {
  it.each([
    [{ minor: 15, patch: 0 }, true],
    [{ minor: 15, patch: 1 }, true],
    [{ major: 8, minor: 0, patch: 0 }, true],
    [{ minor: 14, patch: 1 }, false],
    [{ minor: 10, patch: 0 }, false],
  ])("reports %o as %s", async (version, expected) => {
    const wallet = new KeepKeyHDWallet(makeMockTransport(version as any));
    expect(await wallet.supportsDiceEntropy()).toBe(expected);
  });

  it("reports false when Features carry no version fields", async () => {
    const wallet = new KeepKeyHDWallet(makeMockTransport({ features: null }));
    expect(await wallet.supportsDiceEntropy()).toBe(false);
  });
});

/**
 * Unit tests for the dice-entropy flag on KeepKeyHDWallet.reset().
 *
 * `diceEntropy` asks the device to collect dice rolls with its own button and
 * fold them into the internal entropy before the seed is committed. The rolls
 * never reach the host — that is the point, since desktop-entered dice only
 * help while the device's own randomness stays secret.
 *
 * The load-bearing property here is NOT that the flag can be set; it is that
 * the field is left ABSENT unless explicitly requested. ResetDevice.dice_entropy
 * only exists in firmware >= 7.15.0, and older firmware rejects a message
 * carrying an unknown field — so setting it unconditionally would break wallet
 * creation on every device already in the field. These tests pin that.
 */
import * as Messages from "@keepkey/device-protocol/lib/messages_pb";

import { KeepKeyHDWallet } from "./keepkey";

function makeMockTransport() {
  return {
    debugLink: false,
    call: jest.fn().mockResolvedValue({ message_type: "Success", message: {} }),
    getDeviceID: jest.fn().mockResolvedValue("mock-device-id"),
    keyring: { addAlias: jest.fn() },
  } as any;
}

/** The ResetDevice protobuf the wallet handed to the transport. */
function sentResetDevice(transport: any): Messages.ResetDevice {
  expect(transport.call).toHaveBeenCalledTimes(1);
  const [messageType, proto] = transport.call.mock.calls[0];
  expect(messageType).toBe(Messages.MessageType.MESSAGETYPE_RESETDEVICE);
  return proto as Messages.ResetDevice;
}

const BASE_RESET = { entropy: 128, label: "test", pin: true, passphrase: false } as const;

describe("KeepKeyHDWallet.reset() dice entropy", () => {
  it("sets dice_entropy when diceEntropy is requested", async () => {
    const transport = makeMockTransport();
    await new KeepKeyHDWallet(transport).reset({ ...BASE_RESET, diceEntropy: true });

    const sent = sentResetDevice(transport);
    expect(sent.hasDiceEntropy()).toBe(true);
    expect(sent.getDiceEntropy()).toBe(true);
  });

  // The old-firmware guard. A device on < 7.15.0 rejects ResetDevice carrying an
  // unknown field, so an absent flag must stay genuinely absent on the wire —
  // "present but false" is not good enough.
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
    // Round-trip through the wire format: the absent case must not carry the
    // field at all, which is what old firmware actually parses.
    const off = makeMockTransport();
    await new KeepKeyHDWallet(off).reset({ ...BASE_RESET });
    const withoutDice = Messages.ResetDevice.deserializeBinary(sentResetDevice(off).serializeBinary());
    expect(withoutDice.hasDiceEntropy()).toBe(false);

    const on = makeMockTransport();
    await new KeepKeyHDWallet(on).reset({ ...BASE_RESET, diceEntropy: true });
    const withDice = Messages.ResetDevice.deserializeBinary(sentResetDevice(on).serializeBinary());
    expect(withDice.hasDiceEntropy()).toBe(true);
    expect(withDice.getDiceEntropy()).toBe(true);
  });

  it("still populates the other reset fields when dice entropy is on", async () => {
    const transport = makeMockTransport();
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

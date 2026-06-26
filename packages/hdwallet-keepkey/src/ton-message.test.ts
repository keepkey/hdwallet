/**
 * Unit tests for TON SignMessage protobuf shims and wrapper.
 */
import * as core from "@keepkey/hdwallet-core";
import * as jspb from "google-protobuf";

import { TonMessageSignature, TonSignMessage, tonSignMessage } from "./ton";
import { messageNameRegistry, messageTypeRegistry } from "./typeRegistry";

const MESSAGETYPE_TONSIGNMESSAGE = 1504;
const MESSAGETYPE_TONMESSAGESIGNATURE = 1505;

const ALLALLALL_TON_PATH = [0x80000000 + 44, 0x80000000 + 607, 0x80000000];

function makeMockTransport(callImpl: jest.Mock) {
  return {
    debugLink: false,
    call: callImpl,
    lockDuring: <T>(fn: () => Promise<T>) => fn(),
  } as any;
}

describe("TON SignMessage protobuf registration", () => {
  it("registers TonSignMessage (1504)", () => {
    expect(messageTypeRegistry[MESSAGETYPE_TONSIGNMESSAGE]).toBeDefined();
    expect(messageNameRegistry[MESSAGETYPE_TONSIGNMESSAGE]).toBe("TonSignMessage");
  });
  it("registers TonMessageSignature (1505)", () => {
    expect(messageTypeRegistry[MESSAGETYPE_TONMESSAGESIGNATURE]).toBeDefined();
    expect(messageNameRegistry[MESSAGETYPE_TONMESSAGESIGNATURE]).toBe("TonMessageSignature");
  });
});

describe("TON SignMessage jspb round-trip", () => {
  it("TonSignMessage: address_n + coin_name + message + show_display", () => {
    const m = new TonSignMessage();
    m.setAddressNList(ALLALLALL_TON_PATH);
    m.setMessage(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
    m.setShowDisplay(false);

    const bytes = m.serializeBinary();
    const decoded = new TonSignMessage();
    TonSignMessage.deserializeBinaryFromReader(decoded, new jspb.BinaryReader(bytes));

    expect(decoded.getAddressNList()).toEqual(ALLALLALL_TON_PATH);
    expect(decoded.getCoinName()).toBe("Ton");
    expect(Array.from(decoded.getMessage() as Uint8Array)).toEqual([0xde, 0xad, 0xbe, 0xef]);
    expect(decoded.getShowDisplay()).toBe(false);
  });

  it("TonMessageSignature: public_key (32) + signature (64)", () => {
    const pk = new Uint8Array(32).fill(0x42);
    const sig = new Uint8Array(64).fill(0x11);
    const m = new TonMessageSignature();
    m.setPublicKey(pk);
    m.setSignature(sig);

    const bytes = m.serializeBinary();
    const decoded = new TonMessageSignature();
    TonMessageSignature.deserializeBinaryFromReader(decoded, new jspb.BinaryReader(bytes));

    expect((decoded.getPublicKey() as Uint8Array).length).toBe(32);
    expect((decoded.getSignature() as Uint8Array).length).toBe(64);
    expect((decoded.getPublicKey() as Uint8Array)[0]).toBe(0x42);
    expect((decoded.getSignature() as Uint8Array)[0]).toBe(0x11);
  });
});

describe("tonSignMessage wrapper", () => {
  it("returns publicKey + signature on success", async () => {
    const expectedPk = new Uint8Array(32).fill(0x99);
    const expectedSig = new Uint8Array(64).fill(0x77);

    const transport = makeMockTransport(
      jest.fn().mockImplementation((mtype: number, _msg: any) => {
        expect(mtype).toBe(MESSAGETYPE_TONSIGNMESSAGE);
        const respProto = new TonMessageSignature();
        respProto.setPublicKey(expectedPk);
        respProto.setSignature(expectedSig);
        return Promise.resolve({
          message_enum: MESSAGETYPE_TONMESSAGESIGNATURE,
          message_type: "TonMessageSignature",
          proto: respProto,
        });
      })
    );

    const result = await tonSignMessage(transport, {
      addressNList: ALLALLALL_TON_PATH,
      message: "test ton message",
    });

    expect((result.publicKey as Uint8Array).length).toBe(32);
    expect((result.signature as Uint8Array).length).toBe(64);
  });

  it("ActionCancelled bubbles up (firmware AdvancedMode gate disabled)", async () => {
    // When the AdvancedMode policy is disabled, firmware shows the
    // "Blocked" review and returns Failure_ActionCancelled. The transport
    // converts that into core.ActionCancelled. Wrapper must not swallow it.
    const transport = makeMockTransport(jest.fn().mockRejectedValue(new core.ActionCancelled()));

    await expect(
      tonSignMessage(transport, {
        addressNList: ALLALLALL_TON_PATH,
        message: "blocked",
      })
    ).rejects.toBeInstanceOf(core.ActionCancelled);
  });
});

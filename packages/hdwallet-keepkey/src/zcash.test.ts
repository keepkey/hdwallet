import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as ZcashMessages from "@keepkey/device-protocol/lib/messages-zcash_pb";

import { zcashSignPczt } from "./zcash";

function makeMockTransport(callImpl: jest.Mock) {
  return {
    debugLink: false,
    call: callImpl,
    lockDuring: <T>(fn: () => Promise<T>) => fn(),
  } as any;
}

const hex32 = (byte: string) => byte.repeat(32);

function action(index: number) {
  return {
    index,
    alpha: hex32("aa"),
    cv_net: hex32("bb"),
    nullifier: "",
    cmx: "",
    epk: "",
    enc_compact: "",
    enc_memo: "",
    enc_noncompact: "",
    rk: "",
    out_ciphertext: "",
    value: 0,
    is_spend: false,
  };
}

describe("zcashSignPczt", () => {
  it("streams multiple transparent inputs using ZcashTransparentSig.next_index", async () => {
    const calls: number[] = [];
    const call = jest.fn().mockImplementation((mtype: number, msg: any) => {
      calls.push(mtype);

      if (calls.length === 1) {
        expect(mtype).toBe(Messages.MessageType.MESSAGETYPE_ZCASHSIGNPCZT);
        const ack = new ZcashMessages.ZcashPCZTActionAck();
        ack.setNextIndex(0);
        return Promise.resolve({
          message_enum: Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTIONACK,
          message_type: "ZcashPCZTActionAck",
          proto: ack,
        });
      }

      if (calls.length >= 2 && calls.length <= 4) {
        const expectedInputIndex = calls.length - 2;
        expect(mtype).toBe(Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTINPUT);
        expect(msg.getIndex()).toBe(expectedInputIndex);

        const sig = new ZcashMessages.ZcashTransparentSig();
        sig.setSignature(new Uint8Array([0x30, expectedInputIndex]));
        sig.setNextIndex(expectedInputIndex === 2 ? 0xff : expectedInputIndex + 1);
        return Promise.resolve({
          message_enum: Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTSIG,
          message_type: "ZcashTransparentSig",
          proto: sig,
        });
      }

      expect(mtype).toBe(Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTION);
      expect(msg.getIndex()).toBe(0);

      const signed = new ZcashMessages.ZcashSignedPCZT();
      signed.addSignatures(new Uint8Array(64).fill(0x42));
      return Promise.resolve({
        message_enum: Messages.MessageType.MESSAGETYPE_ZCASHSIGNEDPCZT,
        message_type: "ZcashSignedPCZT",
        proto: signed,
      });
    });

    const result = (await zcashSignPczt(
      makeMockTransport(call),
      {
        n_actions: 1,
        digests: {
          header: hex32("01"),
          transparent: hex32("02"),
          sapling: hex32("03"),
          orchard: hex32("04"),
        },
        bundle_meta: {
          flags: 3,
          value_balance: 0,
          anchor: hex32("05"),
        },
        actions: [action(0)],
        display: {
          amount: "0.001 ZEC",
          fee: "0.0001 ZEC",
          to: "Orchard",
        },
        transparent_inputs: [0, 1, 2].map((index) => ({
          index,
          sighash: hex32("06"),
          addressNList: [0x80000000 + 44, 0x80000000 + 133, 0x80000000, 0, index],
          amount: 1000,
        })),
      },
      hex32("07")
    )) as any;

    expect(result).toHaveLength(1);
    expect(result._transparentSignatures).toEqual(["3000", "3001", "3002"]);
    expect(calls).toEqual([
      Messages.MessageType.MESSAGETYPE_ZCASHSIGNPCZT,
      Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTINPUT,
      Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTINPUT,
      Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTINPUT,
      Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTION,
    ]);
  });
});

/**
 * Unit tests for Solana off-chain message signing protobuf shims and wrapper.
 *
 * Off-chain spec envelope (constructed firmware-side):
 *   "\xff" || "solana offchain" || version:u8 || format:u8 || length:u16 LE || message
 */
import * as jspb from "google-protobuf";

import { SolanaOffchainMessageSignature, SolanaSignOffchainMessage, solanaSignOffchainMessage } from "./solana";
import { messageNameRegistry, messageTypeRegistry } from "./typeRegistry";

const MESSAGETYPE_SOLANASIGNOFFCHAINMESSAGE = 756;
const MESSAGETYPE_SOLANAOFFCHAINMESSAGESIGNATURE = 757;

const ALLALLALL_SOLANA_PATH = [0x80000000 + 44, 0x80000000 + 501, 0x80000000, 0x80000000];

function makeMockTransport(callImpl: jest.Mock) {
  return {
    debugLink: false,
    call: callImpl,
    lockDuring: <T>(fn: () => Promise<T>) => fn(),
  } as any;
}

describe("Solana SignOffchainMessage protobuf registration", () => {
  it("registers SolanaSignOffchainMessage (756)", () => {
    expect(messageTypeRegistry[MESSAGETYPE_SOLANASIGNOFFCHAINMESSAGE]).toBeDefined();
    expect(messageNameRegistry[MESSAGETYPE_SOLANASIGNOFFCHAINMESSAGE]).toBe("SolanaSignOffchainMessage");
  });
  it("registers SolanaOffchainMessageSignature (757)", () => {
    expect(messageTypeRegistry[MESSAGETYPE_SOLANAOFFCHAINMESSAGESIGNATURE]).toBeDefined();
    expect(messageNameRegistry[MESSAGETYPE_SOLANAOFFCHAINMESSAGESIGNATURE]).toBe("SolanaOffchainMessageSignature");
  });
});

describe("Solana SignOffchainMessage jspb round-trip", () => {
  it("SolanaSignOffchainMessage: all fields", () => {
    const m = new SolanaSignOffchainMessage();
    m.setAddressNList(ALLALLALL_SOLANA_PATH);
    m.setVersion(0);
    m.setMessageFormat(0);
    m.setMessage(new Uint8Array([0x68, 0x69])); // "hi"
    m.setShowDisplay(true);

    const bytes = m.serializeBinary();
    const decoded = new SolanaSignOffchainMessage();
    SolanaSignOffchainMessage.deserializeBinaryFromReader(decoded, new jspb.BinaryReader(bytes));

    expect(decoded.getAddressNList()).toEqual(ALLALLALL_SOLANA_PATH);
    expect(decoded.getCoinName()).toBe("Solana");
    expect(decoded.getVersion()).toBe(0);
    expect(decoded.getMessageFormat()).toBe(0);
    expect(Array.from(decoded.getMessage() as Uint8Array)).toEqual([0x68, 0x69]);
    expect(decoded.getShowDisplay()).toBe(true);
  });

  it("SolanaSignOffchainMessage: format=1 UTF-8 limited at boundary (1212 bytes)", () => {
    const m = new SolanaSignOffchainMessage();
    m.setAddressNList(ALLALLALL_SOLANA_PATH);
    m.setMessageFormat(1);
    m.setMessage(new Uint8Array(1212).fill(0x41)); // "A"*1212

    const bytes = m.serializeBinary();
    const decoded = new SolanaSignOffchainMessage();
    SolanaSignOffchainMessage.deserializeBinaryFromReader(decoded, new jspb.BinaryReader(bytes));

    expect(decoded.getMessageFormat()).toBe(1);
    expect((decoded.getMessage() as Uint8Array).length).toBe(1212);
  });

  it("SolanaOffchainMessageSignature: public_key (32) + signature (64)", () => {
    const pk = new Uint8Array(32).fill(0x33);
    const sig = new Uint8Array(64).fill(0x55);
    const m = new SolanaOffchainMessageSignature();
    m.setPublicKey(pk);
    m.setSignature(sig);

    const bytes = m.serializeBinary();
    const decoded = new SolanaOffchainMessageSignature();
    SolanaOffchainMessageSignature.deserializeBinaryFromReader(decoded, new jspb.BinaryReader(bytes));

    expect((decoded.getPublicKey() as Uint8Array).length).toBe(32);
    expect((decoded.getSignature() as Uint8Array).length).toBe(64);
    expect((decoded.getPublicKey() as Uint8Array)[0]).toBe(0x33);
    expect((decoded.getSignature() as Uint8Array)[0]).toBe(0x55);
  });
});

describe("solanaSignOffchainMessage wrapper", () => {
  it("encodes string message as UTF-8 bytes", async () => {
    const transport = makeMockTransport(
      jest.fn().mockImplementation((mtype: number, msg: any) => {
        expect(mtype).toBe(MESSAGETYPE_SOLANASIGNOFFCHAINMESSAGE);
        // Wrapper should have UTF-8 encoded "hi"
        expect(Array.from(msg.getMessage() as Uint8Array)).toEqual([0x68, 0x69]);

        const respProto = new SolanaOffchainMessageSignature();
        respProto.setPublicKey(new Uint8Array(32));
        respProto.setSignature(new Uint8Array(64));
        return Promise.resolve({
          message_enum: MESSAGETYPE_SOLANAOFFCHAINMESSAGESIGNATURE,
          message_type: "SolanaOffchainMessageSignature",
          proto: respProto,
        });
      })
    );

    await solanaSignOffchainMessage(transport, {
      addressNList: ALLALLALL_SOLANA_PATH,
      message: "hi",
    });
  });

  it("forwards version + messageFormat parameters", async () => {
    const transport = makeMockTransport(
      jest.fn().mockImplementation((_mtype: number, msg: any) => {
        expect(msg.getVersion()).toBe(0);
        expect(msg.getMessageFormat()).toBe(1);
        const respProto = new SolanaOffchainMessageSignature();
        respProto.setPublicKey(new Uint8Array(32));
        respProto.setSignature(new Uint8Array(64));
        return Promise.resolve({
          message_enum: MESSAGETYPE_SOLANAOFFCHAINMESSAGESIGNATURE,
          message_type: "SolanaOffchainMessageSignature",
          proto: respProto,
        });
      })
    );

    await solanaSignOffchainMessage(transport, {
      addressNList: ALLALLALL_SOLANA_PATH,
      version: 0,
      messageFormat: 1,
      message: "test",
    });
  });

  it("returns publicKey + signature on success", async () => {
    const transport = makeMockTransport(
      jest.fn().mockImplementation(() => {
        const respProto = new SolanaOffchainMessageSignature();
        respProto.setPublicKey(new Uint8Array(32).fill(0xa1));
        respProto.setSignature(new Uint8Array(64).fill(0xb2));
        return Promise.resolve({
          message_enum: MESSAGETYPE_SOLANAOFFCHAINMESSAGESIGNATURE,
          message_type: "SolanaOffchainMessageSignature",
          proto: respProto,
        });
      })
    );

    const result = await solanaSignOffchainMessage(transport, {
      addressNList: ALLALLALL_SOLANA_PATH,
      message: "verify-binding",
    });

    expect((result.publicKey as Uint8Array).length).toBe(32);
    expect((result.publicKey as Uint8Array)[0]).toBe(0xa1);
    expect((result.signature as Uint8Array).length).toBe(64);
    expect((result.signature as Uint8Array)[0]).toBe(0xb2);
  });
});

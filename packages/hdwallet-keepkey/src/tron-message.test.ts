/**
 * Unit tests for TRON message-signing protobuf shims and wrapper functions.
 *
 * Covers:
 *   - Type registry registration (1404-1408)
 *   - jspb round-trip (serializeBinary → deserializeBinaryFromReader)
 *     for TronSignMessage / TronMessageSignature / TronVerifyMessage /
 *     TronSignTypedHash / TronTypedDataSignature
 *   - tronSignMessage wrapper: success path
 *   - tronVerifyMessage wrapper: success, mismatch (Failure→false),
 *     and ActionCancelled (bubbles past the catch) — this is the
 *     load-bearing regression for the Promise<boolean> contract
 *   - tronSignTypedHash wrapper: 32-byte hash validation
 */
import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as core from "@keepkey/hdwallet-core";
import * as jspb from "google-protobuf";

import {
  TronMessageSignature,
  TronSignMessage,
  tronSignMessage,
  TronSignTypedHash,
  tronSignTypedHash,
  TronTypedDataSignature,
  TronVerifyMessage,
  tronVerifyMessage,
} from "./tron";
import { messageNameRegistry, messageTypeRegistry } from "./typeRegistry";

const MESSAGETYPE_TRONSIGNMESSAGE = 1404;
const MESSAGETYPE_TRONMESSAGESIGNATURE = 1405;
const MESSAGETYPE_TRONVERIFYMESSAGE = 1406;
const MESSAGETYPE_TRONSIGNTYPEDHASH = 1407;
const MESSAGETYPE_TRONTYPEDDATASIGNATURE = 1408;

const ALLALLALL_TRON_PATH = [0x80000000 + 44, 0x80000000 + 195, 0x80000000, 0, 0];

function makeMockTransport(callImpl: jest.Mock) {
  return {
    debugLink: false,
    call: callImpl,
    lockDuring: <T>(fn: () => Promise<T>) => fn(),
  } as any;
}

describe("TRON message-signing protobuf registration", () => {
  it("registers TronSignMessage (1404)", () => {
    expect(messageTypeRegistry[MESSAGETYPE_TRONSIGNMESSAGE]).toBeDefined();
    expect(messageNameRegistry[MESSAGETYPE_TRONSIGNMESSAGE]).toBe("TronSignMessage");
  });
  it("registers TronMessageSignature (1405)", () => {
    expect(messageTypeRegistry[MESSAGETYPE_TRONMESSAGESIGNATURE]).toBeDefined();
    expect(messageNameRegistry[MESSAGETYPE_TRONMESSAGESIGNATURE]).toBe("TronMessageSignature");
  });
  it("registers TronVerifyMessage (1406)", () => {
    expect(messageTypeRegistry[MESSAGETYPE_TRONVERIFYMESSAGE]).toBeDefined();
    expect(messageNameRegistry[MESSAGETYPE_TRONVERIFYMESSAGE]).toBe("TronVerifyMessage");
  });
  it("registers TronSignTypedHash (1407)", () => {
    expect(messageTypeRegistry[MESSAGETYPE_TRONSIGNTYPEDHASH]).toBeDefined();
    expect(messageNameRegistry[MESSAGETYPE_TRONSIGNTYPEDHASH]).toBe("TronSignTypedHash");
  });
  it("registers TronTypedDataSignature (1408)", () => {
    expect(messageTypeRegistry[MESSAGETYPE_TRONTYPEDDATASIGNATURE]).toBeDefined();
    expect(messageNameRegistry[MESSAGETYPE_TRONTYPEDDATASIGNATURE]).toBe("TronTypedDataSignature");
  });
});

describe("TRON message-signing jspb round-trip", () => {
  it("TronSignMessage: address_n + coin_name + message + show_display", () => {
    const m = new TronSignMessage();
    m.setAddressNList(ALLALLALL_TRON_PATH);
    m.setMessage(new Uint8Array([0x68, 0x69])); // "hi"
    m.setShowDisplay(true);

    const bytes = m.serializeBinary();
    const decoded = new TronSignMessage();
    TronSignMessage.deserializeBinaryFromReader(decoded, new jspb.BinaryReader(bytes));

    expect(decoded.getAddressNList()).toEqual(ALLALLALL_TRON_PATH);
    expect(decoded.getCoinName()).toBe("Tron");
    expect(Array.from(decoded.getMessage() as Uint8Array)).toEqual([0x68, 0x69]);
    expect(decoded.getShowDisplay()).toBe(true);
  });

  it("TronSignMessage: empty message is preserved (TIP-191 allows zero-length)", () => {
    const m = new TronSignMessage();
    m.setAddressNList(ALLALLALL_TRON_PATH);
    m.setMessage(new Uint8Array());
    const bytes = m.serializeBinary();
    const decoded = new TronSignMessage();
    TronSignMessage.deserializeBinaryFromReader(decoded, new jspb.BinaryReader(bytes));
    // Empty bytes are wire-equivalent to absent — decoder may yield either
    // undefined or an empty Uint8Array. Both shapes are acceptable for an
    // empty payload; collapsing to a length lets us assert without an
    // `if`-gated `expect` (which jest/no-conditional-expect forbids).
    const got = decoded.getMessage();
    const length = got === undefined ? 0 : got.length;
    expect(length).toBe(0);
  });

  it("TronMessageSignature: address + signature", () => {
    const m = new TronMessageSignature();
    m.setAddress("TKtWbdpEq1zHGvF3pGZmAgdJaaCxXn5fW9");
    const sig = new Uint8Array(65).fill(0xab);
    sig[64] = 27;
    m.setSignature(sig);

    const bytes = m.serializeBinary();
    const decoded = new TronMessageSignature();
    TronMessageSignature.deserializeBinaryFromReader(decoded, new jspb.BinaryReader(bytes));

    expect(decoded.getAddress()).toBe("TKtWbdpEq1zHGvF3pGZmAgdJaaCxXn5fW9");
    expect(Array.from(decoded.getSignature() as Uint8Array)).toEqual(Array.from(sig));
  });

  it("TronVerifyMessage: address + signature + message", () => {
    const m = new TronVerifyMessage();
    m.setAddress("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t");
    m.setSignature(new Uint8Array(65).fill(0x11));
    m.setMessage(new Uint8Array([0x77, 0x66]));

    const bytes = m.serializeBinary();
    const decoded = new TronVerifyMessage();
    TronVerifyMessage.deserializeBinaryFromReader(decoded, new jspb.BinaryReader(bytes));

    expect(decoded.getAddress()).toBe("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t");
    expect((decoded.getSignature() as Uint8Array).length).toBe(65);
    expect(Array.from(decoded.getMessage() as Uint8Array)).toEqual([0x77, 0x66]);
  });

  it("TronSignTypedHash: domain hash + message hash", () => {
    const ds = new Uint8Array(32).fill(0xaa);
    const mh = new Uint8Array(32).fill(0xbb);
    const m = new TronSignTypedHash();
    m.setAddressNList(ALLALLALL_TRON_PATH);
    m.setDomainSeparatorHash(ds);
    m.setMessageHash(mh);

    const bytes = m.serializeBinary();
    const decoded = new TronSignTypedHash();
    TronSignTypedHash.deserializeBinaryFromReader(decoded, new jspb.BinaryReader(bytes));

    expect(decoded.getAddressNList()).toEqual(ALLALLALL_TRON_PATH);
    expect(decoded.getCoinName()).toBe("Tron");
    expect((decoded.getDomainSeparatorHash() as Uint8Array).length).toBe(32);
    expect((decoded.getDomainSeparatorHash() as Uint8Array)[0]).toBe(0xaa);
    expect((decoded.getMessageHash() as Uint8Array)[0]).toBe(0xbb);
  });

  it("TronSignTypedHash: domain-only (primaryType=EIP712Domain)", () => {
    const ds = new Uint8Array(32).fill(0xcc);
    const m = new TronSignTypedHash();
    m.setAddressNList(ALLALLALL_TRON_PATH);
    m.setDomainSeparatorHash(ds);
    // intentionally omit message_hash

    const bytes = m.serializeBinary();
    const decoded = new TronSignTypedHash();
    TronSignTypedHash.deserializeBinaryFromReader(decoded, new jspb.BinaryReader(bytes));

    expect((decoded.getDomainSeparatorHash() as Uint8Array)[0]).toBe(0xcc);
    expect(decoded.getMessageHash()).toBeUndefined();
  });

  it("TronTypedDataSignature: address + signature", () => {
    const m = new TronTypedDataSignature();
    m.setAddress("TLPhTnp8YTzDQqYWGV6tF9oTaXSc8E7DLp");
    m.setSignature(new Uint8Array(65).fill(0x22));

    const bytes = m.serializeBinary();
    const decoded = new TronTypedDataSignature();
    TronTypedDataSignature.deserializeBinaryFromReader(decoded, new jspb.BinaryReader(bytes));

    expect(decoded.getAddress()).toBe("TLPhTnp8YTzDQqYWGV6tF9oTaXSc8E7DLp");
    expect((decoded.getSignature() as Uint8Array).length).toBe(65);
  });
});

describe("tronSignMessage wrapper", () => {
  it("returns address + signature on success", async () => {
    const expectedAddr = "TKtWbdpEq1zHGvF3pGZmAgdJaaCxXn5fW9";
    const expectedSig = new Uint8Array(65).fill(0xab);
    expectedSig[64] = 27;

    const transport = makeMockTransport(
      jest.fn().mockImplementation((mtype: number, _msg: any) => {
        expect(mtype).toBe(MESSAGETYPE_TRONSIGNMESSAGE);
        const respProto = new TronMessageSignature();
        respProto.setAddress(expectedAddr);
        respProto.setSignature(expectedSig);
        return Promise.resolve({
          message_enum: MESSAGETYPE_TRONMESSAGESIGNATURE,
          message_type: "TronMessageSignature",
          proto: respProto,
        });
      })
    );

    const result = await tronSignMessage(transport, {
      addressNList: ALLALLALL_TRON_PATH,
      message: "hello tron",
    });

    expect(result.address).toBe(expectedAddr);
    expect(Array.from(result.signature as Uint8Array)).toEqual(Array.from(expectedSig));
  });

  it("encodes UTF-8 strings as bytes when message is a string", async () => {
    const transport = makeMockTransport(
      jest.fn().mockImplementation((_mtype: number, msg: any) => {
        // Verify the wrapper encoded "hi" → [0x68, 0x69]
        expect(Array.from(msg.getMessage() as Uint8Array)).toEqual([0x68, 0x69]);
        const respProto = new TronMessageSignature();
        respProto.setAddress("T0");
        respProto.setSignature(new Uint8Array(65));
        return Promise.resolve({
          message_enum: MESSAGETYPE_TRONMESSAGESIGNATURE,
          message_type: "TronMessageSignature",
          proto: respProto,
        });
      })
    );

    await tronSignMessage(transport, {
      addressNList: ALLALLALL_TRON_PATH,
      message: "hi",
    });
  });
});

describe("tronVerifyMessage wrapper", () => {
  it("returns true on Success response", async () => {
    const transport = makeMockTransport(
      jest.fn().mockImplementation(() =>
        Promise.resolve({
          message_enum: 2 /* MESSAGETYPE_SUCCESS */,
          message_type: "Success",
          proto: { getMessage: () => "Message verified" },
        })
      )
    );

    const ok = await tronVerifyMessage(transport, {
      address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      signature: new Uint8Array(65),
      message: "any",
    });
    expect(ok).toBe(true);
  });

  it("returns false when transport.call() throws Failure (mismatch)", async () => {
    // Regression for keepkey/hdwallet#38 review finding:
    // Promise<boolean> contract was broken — caller got a rejected
    // promise on signature mismatch instead of resolved `false`.
    const failureEvent = {
      message_enum: Messages.MessageType.MESSAGETYPE_FAILURE,
      message_type: "Failure",
      message: { code: 9 /* SyntaxError */, message: "Invalid signature" },
    };
    const transport = makeMockTransport(jest.fn().mockRejectedValue(failureEvent));

    const ok = await tronVerifyMessage(transport, {
      address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
      signature: new Uint8Array(65),
      message: "any",
    });
    expect(ok).toBe(false);
  });

  it("ActionCancelled bubbles past the catch (cancel != mismatch)", async () => {
    const transport = makeMockTransport(jest.fn().mockRejectedValue(new core.ActionCancelled()));

    await expect(
      tronVerifyMessage(transport, {
        address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        signature: new Uint8Array(65),
        message: "any",
      })
    ).rejects.toBeInstanceOf(core.ActionCancelled);
  });
});

describe("tronSignTypedHash wrapper", () => {
  it("rejects domain hash with wrong length", async () => {
    const transport = makeMockTransport(jest.fn());
    await expect(
      tronSignTypedHash(transport, {
        addressNList: ALLALLALL_TRON_PATH,
        domainSeparatorHash: new Uint8Array(31), // too short
      })
    ).rejects.toThrow(/domain_separator_hash must be exactly 32 bytes/);
  });

  it("rejects message hash with wrong length", async () => {
    const transport = makeMockTransport(jest.fn());
    await expect(
      tronSignTypedHash(transport, {
        addressNList: ALLALLALL_TRON_PATH,
        domainSeparatorHash: new Uint8Array(32),
        messageHash: new Uint8Array(33), // too long
      })
    ).rejects.toThrow(/message_hash must be exactly 32 bytes/);
  });

  it("returns address + signature on success", async () => {
    const transport = makeMockTransport(
      jest.fn().mockImplementation(() => {
        const respProto = new TronTypedDataSignature();
        respProto.setAddress("TLPhTnp8YTzDQqYWGV6tF9oTaXSc8E7DLp");
        respProto.setSignature(new Uint8Array(65).fill(0x22));
        return Promise.resolve({
          message_enum: MESSAGETYPE_TRONTYPEDDATASIGNATURE,
          message_type: "TronTypedDataSignature",
          proto: respProto,
        });
      })
    );

    const result = await tronSignTypedHash(transport, {
      addressNList: ALLALLALL_TRON_PATH,
      domainSeparatorHash: new Uint8Array(32).fill(0xaa),
      messageHash: new Uint8Array(32).fill(0xbb),
    });

    expect(result.address).toBe("TLPhTnp8YTzDQqYWGV6tF9oTaXSc8E7DLp");
    expect((result.signature as Uint8Array).length).toBe(65);
  });
});

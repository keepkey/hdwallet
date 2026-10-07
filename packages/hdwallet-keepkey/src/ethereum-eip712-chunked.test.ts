import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as Ethereum from "@keepkey/device-protocol/lib/messages-ethereum_pb";
import * as Types from "@keepkey/device-protocol/lib/types_pb";
import * as core from "@keepkey/hdwallet-core";

import { ethSignTypedData, typedDataLongValues } from "./ethereum";
import { Transport, TransportDelegate } from "./transport";

// EIP-712 values over 1 KB, through the real Transport against a scripted
// device (firmware 7.16 eip712_stream.c chunk_begin / chunk_next / request_chunk).

type Frame = { type: number; body: Uint8Array };

const MT = Messages.MessageType;
const PATH = [0x8000002c, 0x8000003c, 0x80000000, 0, 0];

function packets({ type, body }: Frame): Uint8Array[] {
  const first = new Uint8Array(64);
  const view = new DataView(first.buffer);
  first.set([0x3f, 0x23, 0x23]);
  view.setUint16(3, type);
  view.setUint32(5, body.length);
  first.set(body.slice(0, 55), 9);
  const out = [first];
  for (let i = 55; i < body.length; i += 63) {
    const next = new Uint8Array(64);
    next[0] = 0x3f;
    next.set(body.slice(i, i + 63), 1);
    out.push(next);
  }
  return out;
}

/** A device that answers each host frame with `respond(frame)`. */
class FakeKeepKey {
  readonly frames: Frame[] = [];
  readonly transport: Transport;
  private pending: number[] = [];
  private outbox: Uint8Array[] = [];
  private respond: (host: Frame, index: number) => Frame;

  constructor(respond: (host: Frame, index: number) => Frame) {
    this.respond = respond;
    const delegate: TransportDelegate = {
      isOpened: async () => true,
      getDeviceID: async () => "fake",
      connect: async () => undefined,
      disconnect: async () => undefined,
      writeChunk: async (chunk: Uint8Array) => this.receive(chunk),
      readChunk: async () => {
        const next = this.outbox.shift();
        if (!next) throw new Error("host read with nothing queued");
        return next;
      },
    };
    this.transport = new Transport(new core.Keyring(), delegate);
  }

  types(): number[] {
    return this.frames.map((f) => f.type);
  }

  ack(index: number): Ethereum.EthereumTypedDataValueAck {
    const acks = this.frames.filter((f) => f.type === 1708);
    return Ethereum.EthereumTypedDataValueAck.deserializeBinary(acks[index].body);
  }

  private receive(chunk: Uint8Array) {
    this.pending.push(...Array.from(chunk.slice(1)));
    const head = new DataView(Uint8Array.from(this.pending.slice(0, 8)).buffer);
    const length = head.getUint32(4);
    if (this.pending.length < 8 + length) return;
    const frame = { type: head.getUint16(2), body: Uint8Array.from(this.pending.slice(8, 8 + length)) };
    this.pending = [];
    this.frames.push(frame);
    this.outbox.push(...packets(this.respond(frame, this.frames.length - 1)));
  }
}

/** EthereumTypedDataValueRequest as the generated 7.20.0 encoder writes it. */
function valueRequest(path: number[], offset?: number): Frame {
  const msg = new Ethereum.EthereumTypedDataValueRequest();
  msg.setMemberPathList(path);
  if (offset !== undefined) msg.setValueOffset(offset);
  return { type: 1707, body: msg.serializeBinary() };
}

function typedSignature(): Frame {
  const msg = new Ethereum.EthereumTypedDataSignature();
  msg.setAddress("0x3f2329C9ADFbcCd9A84f52c906E936A42dA18CB8");
  msg.setSignature(new Uint8Array(65).fill(0x33));
  return { type: 113, body: msg.serializeBinary() };
}

function failure(text: string, code: Types.FailureTypeMap[keyof Types.FailureTypeMap]): Frame {
  const msg = new Messages.Failure();
  msg.setCode(code);
  msg.setMessage(text);
  return { type: MT.MESSAGETYPE_FAILURE, body: msg.serializeBinary() };
}

/** The generated encoder's bytes for a ValueAck, to compare the host's against. */
function generatedAck(value: Uint8Array, total?: number, offset?: number): string {
  const msg = new Ethereum.EthereumTypedDataValueAck();
  msg.setValue(value);
  if (total !== undefined) msg.setValueTotalLength(total);
  if (offset !== undefined) msg.setValueOffset(offset);
  return Buffer.from(msg.serializeBinary()).toString("hex");
}

const hexOf = (b: Uint8Array) => Buffer.from(b).toString("hex");

type Mode = "legacy" | "refuse" | "chunk";
function sign(device: FakeKeepKey, typedData: any, mode?: Mode) {
  return ethSignTypedData(device.transport, { addressNList: PATH, typedData }, mode);
}

function untouched(): FakeKeepKey {
  return new FakeKeepKey(() => {
    throw new Error("nothing should reach the device");
  });
}

// Safe MultiSend: SafeTx.data is several KB.
const MULTISEND = new Uint8Array(4900).map((_, i) => (i * 31 + 7) & 0xff);
const SAFE_TX = {
  types: {
    EIP712Domain: [
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    SafeTx: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "operation", type: "uint8" },
      { name: "safeTxGas", type: "uint256" },
      { name: "baseGas", type: "uint256" },
      { name: "gasPrice", type: "uint256" },
      { name: "gasToken", type: "address" },
      { name: "refundReceiver", type: "address" },
      { name: "nonce", type: "uint256" },
    ],
  },
  primaryType: "SafeTx",
  domain: { chainId: 1, verifyingContract: "0x1111111111111111111111111111111111111111" },
  message: {
    to: "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
    value: "0",
    data: "0x" + hexOf(MULTISEND),
    operation: 1,
    safeTxGas: "0",
    baseGas: "0",
    gasPrice: "0",
    gasToken: "0x0000000000000000000000000000000000000000",
    refundReceiver: "0x0000000000000000000000000000000000000000",
    nonce: "7",
  },
};

function noteDoc(note: string) {
  return {
    types: {
      EIP712Domain: [{ name: "name", type: "string" }],
      Proposal: [{ name: "body", type: "string" }],
    },
    primaryType: "Proposal",
    domain: { name: "snapshot" },
    message: { body: note },
  };
}

describe("typedDataLongValues", () => {
  const CHUNKED = Messages.Features.Capability.CAPABILITY_EIP712_CHUNKED_VALUES;
  function features(major: number, minor: number, capabilities: number[] = []): Messages.Features.AsObject {
    const out = { majorVersion: major, minorVersion: minor, patchVersion: 0, capabilitiesList: capabilities };
    return out as Messages.Features.AsObject;
  }

  it("chunks only on 7.16.0+ with the capability, and fails closed", () => {
    expect(typedDataLongValues(features(7, 16, [CHUNKED]))).toBe("chunk");
    expect(typedDataLongValues(features(8, 0, [CHUNKED]))).toBe("chunk");
    expect(typedDataLongValues(features(7, 16))).toBe("refuse");
    // Below 7.16 nothing changes, capability or not.
    expect(typedDataLongValues(features(7, 15, [CHUNKED]))).toBe("legacy");
    expect(typedDataLongValues(features(7, 14))).toBe("legacy");
    expect(typedDataLongValues(undefined)).toBe("legacy");
    expect(typedDataLongValues({} as Messages.Features.AsObject)).toBe("legacy");
  });
});

describe("EIP-712 values over 1 KB (firmware 7.16)", () => {
  it("sends SafeTx MultiSend data in 1 KB chunks, the first naming the total", async () => {
    const offsets = [1024, 2048, 3072, 4096];
    const device = new FakeKeepKey((host, i) => {
      if (i === 0) return valueRequest([1, 2]);
      if (i <= offsets.length) return valueRequest([1, 2], offsets[i - 1]);
      return typedSignature();
    });

    const signed = await sign(device, SAFE_TX, "chunk");

    expect(signed.signature).toBe("0x" + "33".repeat(65));
    expect(device.types()).toEqual([1704, 1708, 1708, 1708, 1708, 1708]);
    const acks = device.frames.slice(1).map((f) => hexOf(f.body));
    expect(acks).toEqual([
      generatedAck(MULTISEND.subarray(0, 1024), 4900),
      ...offsets.map((o) => generatedAck(MULTISEND.subarray(o, o + 1024), undefined, o)),
    ]);
    const first = device.ack(0);
    expect([first.hasValueTotalLength(), first.hasValueOffset()]).toEqual([true, false]);
    const last = device.ack(4);
    expect(last.getValue_asU8().length).toBe(804);
    expect([last.hasValueTotalLength(), last.getValueOffset()]).toEqual([false, 4096]);
  });

  it("serves a string's second reading from offset 0 with the offset present", async () => {
    const note = "é".repeat(750); // 1500 bytes
    const reads = [undefined, 1024, 0, 1024];
    const device = new FakeKeepKey((host, i) => {
      if (i < reads.length) return valueRequest([1, 0], reads[i]);
      return typedSignature();
    });

    await sign(device, noteDoc(note), "chunk");

    const bytes = new TextEncoder().encode(note);
    expect(device.frames.slice(1).map((f) => hexOf(f.body))).toEqual([
      generatedAck(bytes.subarray(0, 1024), 1500),
      generatedAck(bytes.subarray(1024), undefined, 1024),
      generatedAck(bytes.subarray(0, 1024), undefined, 0),
      generatedAck(bytes.subarray(1024), undefined, 1024),
    ]);
    expect(device.ack(2).hasValueOffset()).toBe(true);
  });

  it("sends exactly 1 KB whole, with neither chunk field, in every mode", async () => {
    for (const mode of ["legacy", "refuse", "chunk"] as const) {
      const device = new FakeKeepKey((host, i) => {
        if (i === 0) return valueRequest([1, 0]);
        return typedSignature();
      });
      await sign(device, noteDoc("x".repeat(1024)), mode);
      expect(hexOf(device.frames[1].body)).toBe(generatedAck(new TextEncoder().encode("x".repeat(1024))));
    }
  });

  it("refuses 1025 bytes on 7.16 without the capability before sending anything", async () => {
    const device = untouched();
    await expect(sign(device, noteDoc("x".repeat(1025)), "refuse")).rejects.toThrow(/chunked values/);
    expect(device.frames).toEqual([]);
  });

  it("refuses a long domain value and a value over 1 MiB before sending anything", async () => {
    const device = untouched();
    const longDomain = { ...noteDoc("short"), domain: { name: "x".repeat(1025) } };
    await expect(sign(device, longDomain, "chunk")).rejects.toThrow(/domain value/);
    await expect(sign(device, noteDoc("x".repeat(1024 * 1024 + 1)), "chunk")).rejects.toThrow(/at most 1048576/);
    expect(device.frames).toEqual([]);
  });

  it("keeps the pre-chunking behaviour below 7.16: 1025 bytes fails when asked, no ack", async () => {
    const device = new FakeKeepKey(() => valueRequest([1, 0]));
    await expect(sign(device, noteDoc("x".repeat(1025)))).rejects.toThrow(
      "string value is 1025 bytes, over the 1024-byte wire limit"
    );
    expect(device.types()).toEqual([1704]);
  });

  it("never falls back to the hashed path once the walk has started", async () => {
    const device = new FakeKeepKey((host, i) => {
      if (i === 0) return valueRequest([1, 2]);
      return failure("Unexpected message", Types.FailureType.FAILURE_UNEXPECTEDMESSAGE);
    });
    await expect(sign(device, SAFE_TX, "chunk")).rejects.toThrow("Unexpected message");
    expect(device.types()).toEqual([1704, 1708]);
    expect(device.types()).not.toContain(MT.MESSAGETYPE_ETHEREUMSIGNTYPEDHASH);
  });

  it("still falls back when the device refuses the document itself", async () => {
    const device = new FakeKeepKey((host, i) => {
      if (i === 0) return failure("Structured EIP-712 disabled", Types.FailureType.FAILURE_OTHER);
      return typedSignature();
    });
    await sign(device, noteDoc("hello"), "chunk");
    expect(device.types()).toEqual([1704, MT.MESSAGETYPE_ETHEREUMSIGNTYPEDHASH]);
  });

  it("below 7.16, a failure after the walk started still falls back as before", async () => {
    const device = new FakeKeepKey((host, i) => {
      if (i === 0) return valueRequest([1, 0]);
      if (i === 1) return failure("arrays are not supported", Types.FailureType.FAILURE_OTHER);
      return typedSignature();
    });
    await sign(device, noteDoc("hello"));
    expect(device.types()).toEqual([1704, 1708, MT.MESSAGETYPE_ETHEREUMSIGNTYPEDHASH]);
  });
});

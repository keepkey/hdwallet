import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as Ethereum from "@keepkey/device-protocol/lib/messages-ethereum_pb";
import * as Types from "@keepkey/device-protocol/lib/types_pb";
import * as core from "@keepkey/hdwallet-core";
import { createHash } from "crypto";
import * as jspb from "google-protobuf";

import { ethSignTx, ethSignTypedData, makeErc7730DefinitionChunk } from "./ethereum";
import * as Erc7730 from "./ethereum-erc7730-proto";
import { Transport, TransportDelegate } from "./transport";

const id = new Uint8Array(32).fill(0x11);
const envelope = new Uint8Array(1500).map((_, index) => index & 0xff);
const contract = new Uint8Array(20).fill(0x22);
const selector = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
const catalog = {
  primaryDefinitionId: id,
  definitions: [
    {
      definitionId: id,
      envelope,
      kind: 1 as const,
      chainId: 1,
      contractAddress: contract,
      selectorOrTypeHash: selector,
    },
  ],
};

function request(offset = 0, length = 1024): Erc7730.EthereumClearSignDefinitionRequest {
  const value = new Erc7730.EthereumClearSignDefinitionRequest();
  value.setKind(Erc7730.EthereumClearSignDefinitionKind.ERC7730_CALLDATA);
  value.setChainId(1);
  value.setContractAddress(contract);
  value.setSelectorOrTypeHash(selector);
  value.setOffset(offset);
  value.setLength(length);
  return value;
}

describe("ERC-7730 signed definition catalog", () => {
  it("serves an exact bounded tuple lookup", async () => {
    const chunk = await makeErc7730DefinitionChunk(catalog, request(1024, 1024));
    expect(chunk.getDefinitionId_asU8()).toEqual(id);
    expect(chunk.getOffset()).toBe(1024);
    expect(chunk.getTotalLength()).toBe(1500);
    expect(chunk.getData_asU8()).toEqual(envelope.slice(1024));
  });

  it("resolves requests by authenticated definition id", async () => {
    const value = request(32, 64);
    value.setDefinitionId(id);
    expect((await makeErc7730DefinitionChunk(catalog, value)).getData_asU8()).toEqual(envelope.slice(32, 96));
  });

  it("refuses unknown, oversized, and over-depth requests", async () => {
    const unknown = request();
    unknown.setSelectorOrTypeHash(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
    await expect(makeErc7730DefinitionChunk(catalog, unknown)).rejects.toThrow("not in the signed catalog");
    await expect(makeErc7730DefinitionChunk(catalog, request(0, 1025))).rejects.toThrow("Invalid ERC-7730 chunk range");
    // Firmware 7.17 nests two levels; anything deeper is not a device request.
    const tooDeep = request();
    tooDeep.setRecursionDepth(3);
    await expect(makeErc7730DefinitionChunk(catalog, tooDeep)).rejects.toThrow("recursion depth exceeds host limit");
  });

  it("refuses a definition-id match with a different request identity", async () => {
    const mismatched = request();
    mismatched.setDefinitionId(id);
    mismatched.setChainId(10);
    await expect(makeErc7730DefinitionChunk(catalog, mismatched)).rejects.toThrow("identity does not match");
  });

  it("answers an unknown embedded call with the empty 'none' chunk", async () => {
    const inner = request();
    inner.setSelectorOrTypeHash(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
    inner.setRecursionDepth(1);
    const none = await makeErc7730DefinitionChunk(catalog, inner);
    expect(none.getDefinitionId_asU8()).toEqual(new Uint8Array(32));
    expect(none.getOffset()).toBe(0);
    expect(none.getTotalLength()).toBe(0);
    expect(none.getData_asU8()).toEqual(new Uint8Array());
  });

  it("resolves a second-level embedded call (firmware 7.17) and keeps it for the replay by id", async () => {
    const innerId = new Uint8Array(32).fill(0x33);
    const innerEnvelope = new Uint8Array(40).fill(0x5a);
    const innerSelector = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const asked: unknown[][] = [];
    const resolving = {
      ...catalog,
      definitions: [...catalog.definitions],
      resolveInner: async (chainId: number, contractAddress: string, sel: string) => {
        asked.push([chainId, contractAddress, sel]);
        return {
          definitionId: innerId,
          envelope: innerEnvelope,
          kind: 1 as const,
          chainId: 1,
          contractAddress: contract,
          selectorOrTypeHash: innerSelector,
        };
      },
    };
    const inner = request(0, 1024);
    inner.setSelectorOrTypeHash(innerSelector);
    inner.setRecursionDepth(2);
    const chunk = await makeErc7730DefinitionChunk(resolving, inner);
    expect(asked).toEqual([[1, "0x" + "22".repeat(20), "0xdeadbeef"]]);
    expect(chunk.getDefinitionId_asU8()).toEqual(innerId);
    expect(chunk.getData_asU8()).toEqual(innerEnvelope);
    const byId = request(8, 8);
    byId.setSelectorOrTypeHash(innerSelector);
    byId.setDefinitionId(innerId);
    expect((await makeErc7730DefinitionChunk(resolving, byId)).getData_asU8()).toEqual(innerEnvelope.slice(8, 16));
    expect(asked.length).toBe(1);
  });

  it("refuses a resolved inner definition for a different call", async () => {
    const inner = request();
    inner.setSelectorOrTypeHash(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
    inner.setRecursionDepth(1);
    const resolving = { ...catalog, resolveInner: async () => catalog.definitions[0] };
    await expect(makeErc7730DefinitionChunk(resolving, inner)).rejects.toThrow("does not match request");
  });
});

// ── A scripted KeepKey behind the real Transport ─────────────────────
// Modelled on python-keepkey's _walk (test_msg_ethereum_erc7730_runtime.py):
// the device leads, the host answers. Frames travel as the same 64-byte USB
// packets a real device exchanges, so the bytes recorded here are exactly the
// bytes hdwallet writes to the wire.

type Frame = { type: number; body: Uint8Array };
type DeviceScript = Generator<Frame | undefined, void, Frame>;

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

class FakeKeepKey {
  readonly frames: Frame[] = [];
  readonly wire: Uint8Array[] = [];
  readonly transport: Transport;
  private pending: number[] = [];
  private outbox: Uint8Array[] = [];
  private script: DeviceScript;

  constructor(script: () => DeviceScript) {
    this.script = script();
    this.script.next();
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

  /** sha256 over every chunk the host wrote, in order. */
  wireDigest(): string {
    const hash = createHash("sha256");
    for (const chunk of this.wire) hash.update(chunk);
    return hash.digest("hex");
  }

  types(): number[] {
    return this.frames.map((frame) => frame.type);
  }

  private receive(chunk: Uint8Array) {
    this.wire.push(chunk.slice());
    this.pending.push(...Array.from(chunk.slice(1)));
    if (this.pending.length < 8) return;
    const head = new DataView(Uint8Array.from(this.pending.slice(0, 8)).buffer);
    const length = head.getUint32(4);
    if (this.pending.length < 8 + length) return;
    const frame = { type: head.getUint16(2), body: Uint8Array.from(this.pending.slice(8, 8 + length)) };
    this.pending = [];
    this.frames.push(frame);
    const step = this.script.next(frame);
    if (step.done || !step.value) throw new Error(`device script has no reply to message ${frame.type}`);
    this.outbox.push(...packets(step.value));
  }
}

function expectFrame(frame: Frame, type: number): Frame {
  if (frame.type !== type) throw new Error(`device expected message ${type}, host sent ${frame.type}`);
  return frame;
}

const reply = (type: number, msg: jspb.Message): Frame => ({ type, body: msg.serializeBinary() });

function buttonRequest(): Frame {
  return reply(MT.MESSAGETYPE_BUTTONREQUEST, new Messages.ButtonRequest());
}

type FailureCode = Types.FailureTypeMap[keyof Types.FailureTypeMap];
function failure(text: string, code: FailureCode = Types.FailureType.FAILURE_OTHER): Frame {
  const msg = new Messages.Failure();
  msg.setCode(code);
  msg.setMessage(text);
  return reply(MT.MESSAGETYPE_FAILURE, msg);
}

function txDataRequest(length: number): Frame {
  const msg = new Ethereum.EthereumTxRequest();
  msg.setDataLength(length);
  return reply(MT.MESSAGETYPE_ETHEREUMTXREQUEST, msg);
}

function txSignature(v = 37): Frame {
  const msg = new Ethereum.EthereumTxRequest();
  msg.setSignatureV(v);
  msg.setSignatureR(new Uint8Array(32).fill(0x11));
  msg.setSignatureS(new Uint8Array(32).fill(0x22));
  return reply(MT.MESSAGETYPE_ETHEREUMTXREQUEST, msg);
}

function typedSignature(): Frame {
  const msg = new Ethereum.EthereumTypedDataSignature();
  msg.setAddress("0x3f2329C9ADFbcCd9A84f52c906E936A42dA18CB8");
  msg.setSignature(new Uint8Array(65).fill(0x33));
  return reply(MT.MESSAGETYPE_ETHEREUMTYPEDDATASIGNATURE, msg);
}

function structRequest(name: string): Frame {
  const writer = new jspb.BinaryWriter();
  writer.writeString(1, name);
  return { type: 1705, body: writer.getResultBuffer() };
}

function valueRequest(path: number[]): Frame {
  const writer = new jspb.BinaryWriter();
  writer.writePackedUint32(1, path);
  return { type: 1707, body: writer.getResultBuffer() };
}

/** Typed-data walk shared by every EIP-712 script: domain, then the primary type. */
const TYPED_DOC = {
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    Order: [
      { name: "maker", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "memo", type: "string" },
    ],
  },
  primaryType: "Order",
  domain: {
    name: "Audit",
    version: "1",
    chainId: 1,
    verifyingContract: "0x1111111111111111111111111111111111111111",
  },
  message: {
    maker: "0x3333333333333333333333333333333333333333",
    amount: "42",
    memo: "hello",
  },
};

function* typedDomainAndPrimary(first: Frame): Generator<Frame, Frame, Frame> {
  expectFrame(first, 1704);
  let host = yield structRequest("EIP712Domain");
  expectFrame(host, 1706);
  for (let i = 0; i < 4; i++) {
    host = yield valueRequest([0, i]);
    expectFrame(host, 1708);
  }
  host = yield structRequest("Order");
  return expectFrame(host, 1706);
}

function* typedMessageWalk(): Generator<Frame, Frame, Frame> {
  let host: Frame | undefined;
  for (let i = 0; i < 3; i++) {
    host = yield valueRequest([1, i]);
    expectFrame(host, 1708);
  }
  return host as Frame;
}

function legacyTx(data: string): core.ETHSignTx {
  return {
    addressNList: PATH,
    nonce: "0x01",
    gasPrice: "0x3b9aca00",
    gasLimit: "0x30d40",
    to: "0x1111111111111111111111111111111111111111",
    value: "0x0",
    data,
    chainId: 1,
  };
}

const hexOf = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");

const LONG_DATA = "0x" + hexOf(new Uint8Array(1500).map((_, i) => (i * 7 + 3) & 0xff));
const SHORT_DATA = "0xa9059cbb" + "00".repeat(12) + "22".repeat(20) + "00".repeat(31) + "2a";

function* plainLongSignTx(): DeviceScript {
  let host = yield;
  expectFrame(host, MT.MESSAGETYPE_ETHEREUMSIGNTX);
  host = yield txDataRequest(476);
  expectFrame(host, MT.MESSAGETYPE_ETHEREUMTXACK);
  host = yield buttonRequest();
  expectFrame(host, MT.MESSAGETYPE_BUTTONACK);
  yield txSignature();
}

function* plainShortSignTx(): DeviceScript {
  let host = yield;
  expectFrame(host, MT.MESSAGETYPE_ETHEREUMSIGNTX);
  host = yield buttonRequest();
  expectFrame(host, MT.MESSAGETYPE_BUTTONACK);
  yield txSignature(1);
}

function* plainTypedData(): DeviceScript {
  const first = yield;
  yield* typedDomainAndPrimary(first);
  yield* typedMessageWalk();
  const host = yield buttonRequest();
  expectFrame(host, MT.MESSAGETYPE_BUTTONACK);
  yield typedSignature();
}

async function plainRuns() {
  const long = new FakeKeepKey(plainLongSignTx);
  await ethSignTx(long.transport, legacyTx(LONG_DATA));
  const short = new FakeKeepKey(plainShortSignTx);
  await ethSignTx(short.transport, {
    ...legacyTx(SHORT_DATA),
    gasPrice: undefined,
    maxFeePerGas: "0x77359400",
    maxPriorityFeePerGas: "0x3b9aca00",
  });
  const typed = new FakeKeepKey(plainTypedData);
  await ethSignTypedData(typed.transport, { addressNList: PATH, typedData: TYPED_DOC });
  return { long, short, typed };
}

// ── ERC-7730 wire helpers ────────────────────────────────────────────

const sha256 = (bytes: Uint8Array) => new Uint8Array(createHash("sha256").update(bytes).digest());

type DefinitionFields = { definitionId: Uint8Array; offset: number; totalLength: number; data: Uint8Array };

/** Decode EthereumClearSignDefinition (1709) or ...Chunk (1712); both share fields 1-4. */
function readDefinitionFields(body: Uint8Array): DefinitionFields {
  const out: DefinitionFields = { definitionId: new Uint8Array(), offset: 0, totalLength: 0, data: new Uint8Array() };
  const reader = new jspb.BinaryReader(body);
  while (reader.nextField()) {
    switch (reader.getFieldNumber()) {
      case 1:
        out.definitionId = reader.readBytes();
        break;
      case 2:
        out.offset = reader.readUint32();
        break;
      case 3:
        out.totalLength = reader.readUint32();
        break;
      case 4:
        out.data = reader.readBytes();
        break;
      default:
        reader.skipField();
    }
  }
  return out;
}

function preloadAck(definitionId: Uint8Array, nextOffset: number, complete: boolean): Frame {
  const ack = new Erc7730.EthereumClearSignDefinitionAck();
  ack.setDefinitionId(definitionId);
  ack.setNextOffset(nextOffset);
  ack.setComplete(complete);
  return { type: 1710, body: ack.serializeBinary() };
}

type DefinitionQuery = {
  kind: number;
  chainId: number;
  contract?: Uint8Array;
  selectorOrTypeHash?: Uint8Array;
  definitionId?: Uint8Array;
  depth?: number;
};

/** EthereumClearSignDefinitionRequest (1711), encoded as firmware 7.16 sends it. */
function definitionRequest(query: DefinitionQuery, offset: number, length: number): Frame {
  const writer = new jspb.BinaryWriter();
  writer.writeEnum(1, query.kind);
  writer.writeUint64(2, query.chainId);
  if (query.contract) writer.writeBytes(3, query.contract);
  if (query.selectorOrTypeHash) writer.writeBytes(4, query.selectorOrTypeHash);
  if (query.definitionId) writer.writeBytes(5, query.definitionId);
  writer.writeUint32(6, offset);
  writer.writeUint32(7, length);
  if (query.depth !== undefined) writer.writeUint32(8, query.depth);
  return { type: 1711, body: writer.getResultBuffer() };
}

/** Accept the preload chunks; returns the first frame that is not a preload. */
function* acceptPreload(first: Frame, preloads: DefinitionFields[]): Generator<Frame, Frame, Frame> {
  let host = first;
  while (host.type === 1709) {
    const chunk = readDefinitionFields(host.body);
    preloads.push(chunk);
    const next = chunk.offset + chunk.data.length;
    host = yield preloadAck(chunk.definitionId, next, next === chunk.totalLength);
  }
  return host;
}

/** Read a whole definition, 1024 bytes at a time, as the device does. */
function* fetchDefinition(query: DefinitionQuery): Generator<Frame, Frame[], Frame> {
  const chunks: Frame[] = [];
  let offset = 0;
  let total = 0;
  do {
    const length = total ? Math.min(1024, total - offset) : 1024;
    const host = expectFrame((yield definitionRequest(query, offset, length)) as Frame, 1712);
    chunks.push(host);
    const chunk = readDefinitionFields(host.body);
    if (chunk.totalLength === 0) break; // "none"
    total = chunk.totalLength;
    offset += chunk.data.length;
  } while (offset < total);
  return chunks;
}

const joinChunks = (chunks: Frame[]) =>
  Uint8Array.from(chunks.flatMap((chunk) => Array.from(readDefinitionFields(chunk.body).data)));

/** One pass over the argument bytes, as the device asks for them (python _walk). */
function* argumentPass(length: number): Generator<Frame, Uint8Array, Frame> {
  const got: number[] = [];
  while (got.length < length) {
    const host = expectFrame((yield txDataRequest(Math.min(1024, length - got.length))) as Frame, 60);
    const chunk = Ethereum.EthereumTxAck.deserializeBinary(host.body).getDataChunk_asU8();
    if (chunk.length === 0) throw new Error("host sent an empty calldata chunk");
    got.push(...Array.from(chunk));
  }
  return Uint8Array.from(got);
}

// ── ERC-7730 calldata on firmware 7.16 ───────────────────────────────

const TO = new Uint8Array(20).fill(0x11);
const SELECTOR = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
const ARGS = new Uint8Array(1100).map((_, i) => (i * 13 + 5) & 0xff);
const OUTER = new Uint8Array(1500).map((_, i) => (i * 3 + 1) & 0xff);
const OUTER_ID = sha256(OUTER);
const CALLEE = new Uint8Array(20).fill(0x44);
const INNER_SELECTOR = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
const INNER = new Uint8Array(1100).map((_, i) => (i * 5 + 9) & 0xff);
const INNER_ID = sha256(INNER);

const outerDefinition: core.ETHErc7730Definition = {
  definitionId: OUTER_ID,
  envelope: OUTER,
  kind: 1,
  chainId: 1,
  contractAddress: TO,
  selectorOrTypeHash: SELECTOR,
};
const innerDefinition: core.ETHErc7730Definition = {
  definitionId: INNER_ID,
  envelope: INNER,
  kind: 1,
  chainId: 1,
  contractAddress: CALLEE,
  selectorOrTypeHash: INNER_SELECTOR,
};
const OUTER_BY_ID: DefinitionQuery = {
  kind: 1,
  chainId: 1,
  contract: TO,
  selectorOrTypeHash: SELECTOR,
  definitionId: OUTER_ID,
};

function erc7730Tx(extra: Partial<NonNullable<core.ETHSignTx["erc7730"]>> = {}): core.ETHSignTx {
  return {
    ...legacyTx("0x" + hexOf(SELECTOR) + hexOf(ARGS)),
    to: "0x" + hexOf(TO),
    erc7730: { primaryDefinitionId: OUTER_ID, definitions: [outerDefinition], ...extra },
  };
}

type CalldataSeen = {
  preloads: DefinitionFields[];
  signTx?: Ethereum.EthereumSignTx;
  reads: Frame[][];
  passes: Uint8Array[];
};

const newSeen = (): CalldataSeen => ({ preloads: [], reads: [], passes: [] });

describe("ERC-7730 calldata transport (firmware 7.16)", () => {
  it("sends a 4-byte initial chunk and replays every argument pass from offset 0", async () => {
    const seen = newSeen();
    const device = new FakeKeepKey(function* (): DeviceScript {
      const host = yield* acceptPreload(yield, seen.preloads);
      seen.signTx = Ethereum.EthereumSignTx.deserializeBinary(expectFrame(host, MT.MESSAGETYPE_ETHEREUMSIGNTX).body);
      // The first reply to SignTx is the definition request.
      seen.reads.push(yield* fetchDefinition(OUTER_BY_ID));
      // Three review passes (intent, two fields), each followed by a screen
      // and a re-read of the definition, then the signing pass.
      for (let pass = 0; pass < 3; pass++) {
        seen.passes.push(yield* argumentPass(ARGS.length));
        expectFrame(yield buttonRequest(), MT.MESSAGETYPE_BUTTONACK);
        seen.reads.push(yield* fetchDefinition(OUTER_BY_ID));
      }
      seen.passes.push(yield* argumentPass(ARGS.length));
      yield txSignature();
    });

    const signed = await ethSignTx(device.transport, erc7730Tx());

    expect(seen.preloads.map((chunk) => [chunk.offset, chunk.data.length, chunk.totalLength])).toEqual([
      [0, 1024, 1500],
      [1024, 476, 1500],
    ]);
    expect(seen.preloads.every((chunk) => hexOf(chunk.definitionId) === hexOf(OUTER_ID))).toBe(true);
    expect(hexOf(core.mustBeDefined(seen.signTx).getDataInitialChunk_asU8())).toBe(hexOf(SELECTOR));
    expect(core.mustBeDefined(seen.signTx).getDataLength()).toBe(4 + ARGS.length);
    expect(seen.passes).toHaveLength(4);
    for (const pass of seen.passes) expect(hexOf(pass)).toBe(hexOf(ARGS));
    expect(seen.reads).toHaveLength(4);
    for (const read of seen.reads) expect(hexOf(joinChunks(read))).toBe(hexOf(OUTER));
    expect(signed.r).toBe("0x" + "11".repeat(32));
  });

  it("refuses a device that skips the preloaded definition", async () => {
    const device = new FakeKeepKey(function* (): DeviceScript {
      const host = yield* acceptPreload(yield, []);
      expectFrame(host, MT.MESSAGETYPE_ETHEREUMSIGNTX);
      yield txDataRequest(ARGS.length);
    });
    await expect(ethSignTx(device.transport, erc7730Tx())).rejects.toThrow(
      "ERC-7730 definition was not used by the device"
    );
  });

  it("answers an unresolved embedded call with 'none' and surfaces the device's refusal", async () => {
    const asked: string[][] = [];
    let none: DefinitionFields | undefined;
    const device = new FakeKeepKey(function* (): DeviceScript {
      const host = yield* acceptPreload(yield, []);
      expectFrame(host, MT.MESSAGETYPE_ETHEREUMSIGNTX);
      yield* fetchDefinition(OUTER_BY_ID);
      yield* argumentPass(ARGS.length);
      const chunks = yield* fetchDefinition({
        kind: 1,
        chainId: 1,
        contract: CALLEE,
        selectorOrTypeHash: INNER_SELECTOR,
        depth: 1,
      });
      none = readDefinitionFields(chunks[0].body);
      yield failure("Inner call cannot be clear-signed");
    });

    const msg = erc7730Tx({
      resolveInner: async (chainId, contractAddress, innerSelector) => {
        asked.push([String(chainId), contractAddress, innerSelector]);
        return undefined;
      },
    });
    await expect(ethSignTx(device.transport, msg)).rejects.toThrow("Inner call cannot be clear-signed");
    expect(asked).toEqual([["1", "0x" + "44".repeat(20), "0xdeadbeef"]]);
    expect(none).toEqual({
      definitionId: new Uint8Array(32),
      offset: 0,
      totalLength: 0,
      data: new Uint8Array(),
    });
  });

  it("resolves an embedded call, replays it by id, and re-serves the outer definition unchanged", async () => {
    const reads: Record<string, Frame[][]> = { outer: [], innerFetch: [], innerById: [] };
    const device = new FakeKeepKey(function* (): DeviceScript {
      const host = yield* acceptPreload(yield, []);
      expectFrame(host, MT.MESSAGETYPE_ETHEREUMSIGNTX);
      reads.outer.push(yield* fetchDefinition(OUTER_BY_ID));
      yield* argumentPass(ARGS.length);
      // Inner definition by (chain, callee, selector) at depth 1, no id.
      reads.innerFetch.push(
        yield* fetchDefinition({ kind: 1, chainId: 1, contract: CALLEE, selectorOrTypeHash: INNER_SELECTOR, depth: 1 })
      );
      // The inner review re-reads it by id, and captures from the outer calldata.
      reads.innerById.push(
        yield* fetchDefinition({
          kind: 1,
          chainId: 1,
          contract: CALLEE,
          selectorOrTypeHash: INNER_SELECTOR,
          definitionId: INNER_ID,
        })
      );
      yield* argumentPass(ARGS.length);
      // Then it restores the outer definition by id alone.
      reads.outer.push(yield* fetchDefinition({ kind: 1, chainId: 1, definitionId: OUTER_ID }));
      yield* argumentPass(ARGS.length);
      yield txSignature();
    });

    let resolves = 0;
    const msg = erc7730Tx({
      resolveInner: async () => {
        resolves++;
        return innerDefinition;
      },
    });
    await ethSignTx(device.transport, msg);

    expect(resolves).toBe(1);
    expect(hexOf(joinChunks(reads.innerFetch[0]))).toBe(hexOf(INNER));
    expect(hexOf(joinChunks(reads.innerById[0]))).toBe(hexOf(INNER));
    expect(reads.outer[1].map((chunk) => hexOf(chunk.body))).toEqual(reads.outer[0].map((chunk) => hexOf(chunk.body)));
    // The caller's catalog is not modified.
    expect(core.mustBeDefined(msg.erc7730).definitions).toEqual([outerDefinition]);
  });
});

describe("signing without erc7730 is unchanged from master (61384155)", () => {
  // sha256 over every USB chunk the host wrote, recorded against master's
  // ethereum.ts before the ERC-7730 changes, with the same scripted device.
  it("writes the same bytes for SignTx and SignTypedData", async () => {
    const { long, short, typed } = await plainRuns();
    expect([long.types(), long.wireDigest()]).toEqual([
      [58, 60, 27],
      "5f4e03c941fe8d4f914174d58f1e7f8552bdc8c576d4f7edf503bbc0145791fd",
    ]);
    expect([short.types(), short.wireDigest()]).toEqual([
      [58, 27],
      "32849221cf7b1029549c972f865c65df2a9c2083aeb544ae10641740dd0a10b1",
    ]);
    expect([typed.types(), typed.wireDigest()]).toEqual([
      [1704, 1706, 1708, 1708, 1708, 1708, 1706, 1708, 1708, 1708, 27],
      "81c1b62b13d70c9bd7819e6747f7038a35ba2b8d4c679716e4d0f4a1ed514918",
    ]);
  });
});

// ── ERC-7730 typed data on firmware 7.16 ─────────────────────────────

const TYPE_HASH = new Uint8Array(32).fill(0x5a);
const TYPED_ENVELOPE = new Uint8Array(1500).map((_, i) => (i * 11 + 7) & 0xff);
const TYPED_ID = sha256(TYPED_ENVELOPE);
const VERIFYING_CONTRACT = new Uint8Array(20).fill(0x11);
const typedDefinition: core.ETHErc7730Definition = {
  definitionId: TYPED_ID,
  envelope: TYPED_ENVELOPE,
  kind: 2,
  chainId: 1,
  contractAddress: VERIFYING_CONTRACT,
  selectorOrTypeHash: TYPE_HASH,
};
const TYPED_BY_ID: DefinitionQuery = {
  kind: 2,
  chainId: 1,
  contract: VERIFYING_CONTRACT,
  selectorOrTypeHash: TYPE_HASH,
  definitionId: TYPED_ID,
};

function typedRequest(extra: Partial<core.ETHSignTypedData> = {}): core.ETHSignTypedData {
  return {
    addressNList: PATH,
    typedData: TYPED_DOC,
    erc7730: { primaryDefinitionId: TYPED_ID, definitions: [typedDefinition] },
    ...extra,
  };
}

/**
 * 7.16 with a preloaded definition: domain walk, primary-type StructRequests,
 * then 1711 once the typeHash is final, the message walk, and one more full
 * walk per ERC-7730 field pass (eip712_stream.c begin_root on resume).
 */
function* typedReview(first: Frame, fieldPasses: number, reads: Frame[][]): Generator<Frame, void, Frame> {
  yield* typedDomainAndPrimary(first);
  reads.push(yield* fetchDefinition(TYPED_BY_ID));
  expectFrame(yield structRequest("Order"), 1706);
  yield* typedMessageWalk();
  expectFrame(yield buttonRequest(), MT.MESSAGETYPE_BUTTONACK);
  for (let pass = 0; pass < fieldPasses; pass++) {
    reads.push(yield* fetchDefinition(TYPED_BY_ID));
    expectFrame(yield structRequest("Order"), 1706);
    yield* typedMessageWalk();
  }
  yield typedSignature();
}

function metadataAck(): Frame {
  const writer = new jspb.BinaryWriter();
  writer.writeUint32(1, 1);
  writer.writeString(2, "Spender: Audit");
  return { type: 116, body: writer.getResultBuffer() };
}

describe("ERC-7730 typed-data transport (firmware 7.16)", () => {
  it("preloads before the document and answers 1711 inside the streaming walk", async () => {
    const preloads: DefinitionFields[] = [];
    const reads: Frame[][] = [];
    const device = new FakeKeepKey(function* (): DeviceScript {
      const first = yield* acceptPreload(yield, preloads);
      yield* typedReview(first, 1, reads);
    });

    const signed = await ethSignTypedData(device.transport, typedRequest());

    expect(signed.signature).toBe("0x" + "33".repeat(65));
    expect(device.types().slice(0, 3)).toEqual([1709, 1709, 1704]);
    expect(preloads.every((chunk) => hexOf(chunk.definitionId) === hexOf(TYPED_ID))).toBe(true);
    expect(reads).toHaveLength(2);
    for (const read of reads) expect(hexOf(joinChunks(read))).toBe(hexOf(TYPED_ENVELOPE));
  });

  it("sends txMetadata, then the preload, then the document", async () => {
    const device = new FakeKeepKey(function* (): DeviceScript {
      expectFrame(yield, 115);
      const first = yield* acceptPreload(yield metadataAck(), []);
      yield* typedReview(first, 0, []);
    });
    await ethSignTypedData(device.transport, typedRequest({ txMetadata: { signedPayload: "0xabcd" } }));
    expect(device.types().slice(0, 4)).toEqual([115, 1709, 1709, 1704]);
  });

  it("never falls back to the legacy typed-data paths with a definition", async () => {
    const device = new FakeKeepKey(function* (): DeviceScript {
      const first = yield* acceptPreload(yield, []);
      expectFrame(first, 1704);
      yield failure("Unexpected message", Types.FailureType.FAILURE_UNEXPECTEDMESSAGE);
    });
    await expect(ethSignTypedData(device.transport, typedRequest())).rejects.toThrow("Unexpected message");
    expect(device.types()).toEqual([1709, 1709, 1704]);
  });

  it("allows the longer walk that repeated field passes need", async () => {
    // 200 field passes x 4 requests is well past the plain walk's 512.
    const withDefinition = new FakeKeepKey(function* (): DeviceScript {
      const first = yield* acceptPreload(yield, []);
      yield* typedReview(first, 200, []);
    });
    await expect(ethSignTypedData(withDefinition.transport, typedRequest())).resolves.toBeDefined();

    const plain = new FakeKeepKey(function* (): DeviceScript {
      const first = yield;
      yield* typedDomainAndPrimary(first);
      for (;;) yield* typedMessageWalk();
    });
    await expect(ethSignTypedData(plain.transport, typedRequest({ erc7730: undefined }))).rejects.toThrow(
      "EIP-712 walk did not terminate"
    );
  });
});

// ── Errors and limits ────────────────────────────────────────────────

/** What a caller (Vault) gets back: the error class and its message text. */
async function rejection(promise: Promise<unknown>): Promise<{ error: unknown; text: string }> {
  try {
    await promise;
  } catch (error) {
    return { error, text: String((error as { message?: unknown })?.message ?? error) };
  }
  throw new Error("expected a rejection");
}

describe("ERC-7730 errors reach the caller", () => {
  it("turns a SignTx refusal into an Error with the device's text", async () => {
    const device = new FakeKeepKey(function* (): DeviceScript {
      const host = yield* acceptPreload(yield, []);
      expectFrame(host, MT.MESSAGETYPE_ETHEREUMSIGNTX);
      yield failure("ERC-7730 definition does not match transaction");
    });
    const { error, text } = await rejection(ethSignTx(device.transport, erc7730Tx()));
    expect(error).toBeInstanceOf(Error);
    expect(text).toBe("ERC-7730 definition does not match transaction");
  });

  it("turns a preload refusal into an Error with the device's text", async () => {
    const device = new FakeKeepKey(function* (): DeviceScript {
      expectFrame(yield, 1709);
      yield failure("Invalid certified ERC-7730 definition");
    });
    const { error, text } = await rejection(ethSignTx(device.transport, erc7730Tx()));
    expect(error).toBeInstanceOf(Error);
    expect(text).toBe("Invalid certified ERC-7730 definition");
  });

  it("reports Cancel on a review screen as ActionCancelled", async () => {
    const device = new FakeKeepKey(function* (): DeviceScript {
      const host = yield* acceptPreload(yield, []);
      expectFrame(host, MT.MESSAGETYPE_ETHEREUMSIGNTX);
      yield* fetchDefinition(OUTER_BY_ID);
      yield* argumentPass(ARGS.length);
      expectFrame(yield buttonRequest(), MT.MESSAGETYPE_BUTTONACK);
      yield failure("Signing cancelled by user", Types.FailureType.FAILURE_ACTIONCANCELLED);
    });
    const { error } = await rejection(ethSignTx(device.transport, erc7730Tx()));
    expect(error).toBeInstanceOf(core.ActionCancelled);
  });

  it("keeps the host's own reason when it cannot answer the device", async () => {
    const unknown = new FakeKeepKey(function* (): DeviceScript {
      const host = yield* acceptPreload(yield, []);
      expectFrame(host, MT.MESSAGETYPE_ETHEREUMSIGNTX);
      yield definitionRequest({ kind: 1, chainId: 1, definitionId: new Uint8Array(32).fill(0x99) }, 0, 1024);
    });
    expect((await rejection(ethSignTx(unknown.transport, erc7730Tx()))).text).toBe(
      "Device requested an ERC-7730 definition that is not in the signed catalog"
    );

    const offline = new FakeKeepKey(function* (): DeviceScript {
      const host = yield* acceptPreload(yield, []);
      expectFrame(host, MT.MESSAGETYPE_ETHEREUMSIGNTX);
      yield* fetchDefinition(OUTER_BY_ID);
      yield definitionRequest(
        { kind: 1, chainId: 1, contract: CALLEE, selectorOrTypeHash: INNER_SELECTOR, depth: 1 },
        0,
        1024
      );
    });
    const msg = erc7730Tx({
      resolveInner: async () => {
        throw new Error("registry offline");
      },
    });
    expect((await rejection(ethSignTx(offline.transport, msg))).text).toBe("registry offline");
  });

  it("refuses a typed-data signature made without the preloaded definition", async () => {
    const device = new FakeKeepKey(function* (): DeviceScript {
      const first = yield* acceptPreload(yield, []);
      yield* typedDomainAndPrimary(first);
      yield* typedMessageWalk();
      expectFrame(yield buttonRequest(), MT.MESSAGETYPE_BUTTONACK);
      yield typedSignature();
    });
    await expect(ethSignTypedData(device.transport, typedRequest())).rejects.toThrow(
      "ERC-7730 definition was not used by the device"
    );
  });
});

describe("ERC-7730 round-trip limits", () => {
  it("finishes a calldata review longer than 4096 round trips", async () => {
    // Firmware 7.16 replays the whole envelope for every selection, per array
    // element: 64 elements x 3 fields, each field 9 selections (display, label,
    // formatter, path, 5 arguments) of 2 chunks and 2 argument passes.
    let trips = 0;
    const device = new FakeKeepKey(function* (): DeviceScript {
      const host = yield* acceptPreload(yield, []);
      expectFrame(host, MT.MESSAGETYPE_ETHEREUMSIGNTX);
      for (let field = 0; field < 64 * 3; field++) {
        for (let selection = 0; selection < 9; selection++) trips += (yield* fetchDefinition(OUTER_BY_ID)).length;
        for (let pass = 0; pass < 2; pass++) {
          yield* argumentPass(ARGS.length);
          trips += 2;
        }
      }
      yield txSignature();
    });
    await expect(ethSignTx(device.transport, erc7730Tx())).resolves.toBeDefined();
    expect(trips).toBeGreaterThan(4096);
  });

  it("finishes a typed-data review longer than 8192 round trips", async () => {
    // Each field pass re-walks the whole message: 4 walk steps and 2 definition
    // chunks per pass here.
    const device = new FakeKeepKey(function* (): DeviceScript {
      const first = yield* acceptPreload(yield, []);
      yield* typedReview(first, 2100, []);
    });
    await expect(ethSignTypedData(device.transport, typedRequest())).resolves.toBeDefined();
    expect(device.types().filter((type) => type === 1706 || type === 1708).length).toBeGreaterThan(8192);
  });
});

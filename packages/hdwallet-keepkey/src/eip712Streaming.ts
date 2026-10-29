/**
 * Structured EIP-712 over the device-driven streaming protocol.
 *
 * The device drives. It asks for one struct definition, or one leaf VALUE, at
 * a time, and hashes each value in the same pass that displays it. This module
 * is the answering half: it owns the document and serves whatever the device
 * addresses.
 *
 * Two things here are load-bearing and easy to get subtly wrong.
 *
 * 1. TYPE SPELLING. `array_levels` lists bracket groups in the order they are
 *    WRITTEN, left to right, because that is the order encodeType reproduces.
 *    `int16[2][][4]` is [2, 0, 4], not the reverse. A wrong order silently
 *    changes typeHash and therefore the signature.
 *
 * 2. VALUE WIDTH. Values go out as raw big-endian bytes of exactly the declared
 *    width -- no JSON, no decimals. The device does no number parsing at all,
 *    which is what removes the old path's 2^63-1 ceiling (every unlimited
 *    approval) and any chance of the host and device disagreeing about what a
 *    decimal string meant. The flip side is that getting the width right is
 *    now entirely the host's job, so encodeValue is strict rather than lenient.
 */

/** Mirrors EthereumTypedDataStructAck.EthereumDataType. */
export enum EthereumDataType {
  UINT = 1,
  INT = 2,
  BYTES = 3,
  STRING = 4,
  BOOL = 5,
  ADDRESS = 6,
  ARRAY = 7, // reserved, never sent -- dimensions live in arrayLevels
  STRUCT = 8,
}

export interface FieldType {
  dataType: EthereumDataType;
  /** bytesN: N. intN/uintN: N in BYTES (so uint256 is 32). */
  size?: number;
  structName?: string;
  /** Written order, left to right. 0 means a dynamic dimension. */
  arrayLevels: number[];
}

const ARRAY_SUFFIX = /\[(\d*)\]/g;

// BigInt literals (1n) are ES2020 SYNTAX and this repo targets ES2016; the
// BigInt function is available because the lib is es2020. Hence constants.
const ZERO = BigInt(0);
const ONE = BigInt(1);
const EIGHT = BigInt(8);
const BYTE_MASK = BigInt(0xff);

/** EthereumTypedDataValueAck.value max_size in messages-ethereum.options, and
 *  EIP712_MAX_LEAF on the device: one ValueAck, and one chunk of a longer
 *  value. Encoding past it produces a value that cannot go in one ValueAck,
 *  so catch it here where the error can name the field rather than at the
 *  transport layer where it cannot. */
export const MAX_LEAF_BYTES = 1024;

/** EIP712_MAX_VALUE on the device: the longest `bytes` or `string` value it
 *  takes in MAX_LEAF_BYTES chunks (Safe MultiSend data, Snapshot bodies). */
export const MAX_VALUE_BYTES = 1024 * 1024;

/**
 * "uint256", "bytes32", "Person[3]", "int16[2][][4]" -> FieldType.
 * Throws rather than guessing: an unparseable type must not become a signature.
 */
export function parseSolidityType(type: string): FieldType {
  const bracket = type.indexOf("[");
  const base = bracket === -1 ? type : type.slice(0, bracket);
  const suffix = bracket === -1 ? "" : type.slice(bracket);

  const arrayLevels: number[] = [];
  if (suffix) {
    // Every bracket group must be well formed; anything left over is a type we
    // do not understand, and signing something we do not understand is the
    // whole failure mode.
    let consumed = 0;
    ARRAY_SUFFIX.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = ARRAY_SUFFIX.exec(suffix)) !== null) {
      if (m.index !== consumed) throw new Error(`Malformed array type: ${type}`);
      if (m[1] === "") {
        arrayLevels.push(0); // dynamic
      } else {
        // 0 is the wire's DYNAMIC sentinel: the device spells array_levels[i]
        // == 0 as "[]". A fixed dimension of 0 therefore has no spelling of its
        // own, and "uint256[0]" would be hashed as "uint256[]" -- a different
        // type string from the one the document declares. Leading zeros
        // re-spell the same way ("[01]" -> "[1]"). Neither is a legal EIP-712
        // type, so refuse rather than silently rewrite.
        if (!/^[1-9][0-9]*$/.test(m[1])) throw new Error(`Malformed array dimension: ${type}`);
        arrayLevels.push(Number(m[1]));
      }
      consumed = ARRAY_SUFFIX.lastIndex;
    }
    if (consumed !== suffix.length) throw new Error(`Malformed array type: ${type}`);
  }

  if (base === "string") return { dataType: EthereumDataType.STRING, arrayLevels };
  if (base === "bool") return { dataType: EthereumDataType.BOOL, arrayLevels };
  if (base === "address") return { dataType: EthereumDataType.ADDRESS, arrayLevels };
  if (base === "bytes") return { dataType: EthereumDataType.BYTES, arrayLevels };

  const bytesN = /^bytes([0-9]*)$/.exec(base);
  if (bytesN) {
    // "bytes032" parses to 32 and would be re-spelled "bytes32" -- a
    // different type string from the document's.
    if (!/^[1-9][0-9]*$/.test(bytesN[1])) throw new Error(`Non-canonical bytes width: ${base}`);
    const n = Number(bytesN[1]);
    if (n < 1 || n > 32) throw new Error(`Invalid fixed bytes width: ${base}`);
    return { dataType: EthereumDataType.BYTES, size: n, arrayLevels };
  }

  const intN = /^(u?)int([0-9]*)$/.exec(base);
  if (intN) {
    // A bare "uint"/"int" is not canonical EIP-712. The old firmware accepted
    // it and hashed it verbatim as 256 bits, which produced a type string no
    // verifier reproduces. Refuse it here rather than pass it on.
    if (intN[2] === "") throw new Error(`Integer type must state its width: ${base}`);
    // Nor is "uint0256" canonical. It would normalise to 256 here and be
    // hashed as "uint256" by the device, while the document a verifier reads
    // says "uint0256". Same failure as the bare form, one spelling further on.
    if (!/^[1-9][0-9]*$/.test(intN[2])) throw new Error(`Non-canonical integer width: ${base}`);
    const bits = Number(intN[2]);
    if (bits < 8 || bits > 256 || bits % 8 !== 0) {
      throw new Error(`Invalid integer width: ${base}`);
    }
    return {
      dataType: intN[1] === "u" ? EthereumDataType.UINT : EthereumDataType.INT,
      size: bits / 8,
      arrayLevels,
    };
  }

  // Anything else names a struct the device will ask us to define.
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(base)) {
    throw new Error(`Unparseable EIP-712 type: ${type}`);
  }
  return { dataType: EthereumDataType.STRUCT, structName: base, arrayLevels };
}

function hexToBytes(hex: string, what: string): Uint8Array {
  const h = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (h.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(h)) {
    throw new Error(`${what} is not valid hex: ${hex}`);
  }
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.substr(i * 2, 2), 16);
  return out;
}

/** Big-endian two's-complement, exactly `width` bytes. Throws on overflow. */
function bigIntToBytes(value: bigint, width: number, signed: boolean): Uint8Array {
  const bits = BigInt(width * 8);
  if (signed) {
    const min = -(ONE << (bits - ONE));
    const max = (ONE << (bits - ONE)) - ONE;
    if (value < min || value > max) throw new Error(`Value out of range for int${width * 8}`);
    if (value < ZERO) value += ONE << bits;
  } else {
    if (value < ZERO) throw new Error(`Negative value for uint${width * 8}`);
    if (value >= ONE << bits) throw new Error(`Value out of range for uint${width * 8}`);
  }
  const out = new Uint8Array(width);
  for (let i = width - 1; i >= 0; i--) {
    out[i] = Number(value & BYTE_MASK);
    value >>= EIGHT;
  }
  return out;
}

function toBigInt(value: unknown, what: string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      // A float or an unsafe integer has already lost precision by the time it
      // reaches us; converting it would sign a number the caller never had.
      throw new Error(`${what} is not a safe integer: ${value}`);
    }
    return BigInt(value);
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (/^-?\d+$/.test(s)) return BigInt(s);
    if (/^0x[0-9a-fA-F]+$/i.test(s)) return BigInt(s);
    throw new Error(`${what} is not an integer: ${value}`);
  }
  throw new Error(`${what} is not an integer: ${String(value)}`);
}

function capLeaf(b: Uint8Array, what: string, maxBytes: number): Uint8Array {
  if (b.length > maxBytes) {
    throw new Error(`${what} value is ${b.length} bytes, over the ${maxBytes}-byte wire limit`);
  }
  return b;
}

/** One leaf, as the exact bytes the device will hash and display. A dynamic
 *  value may be up to `maxBytes` long; past MAX_LEAF_BYTES only
 *  answerValueRequest() can put it on the wire. */
export function encodeValue(field: FieldType, value: unknown, maxBytes = MAX_LEAF_BYTES): Uint8Array {
  switch (field.dataType) {
    case EthereumDataType.UINT:
    case EthereumDataType.INT: {
      if (field.size === undefined) throw new Error("Integer field has no width");
      return bigIntToBytes(toBigInt(value, "Integer field"), field.size, field.dataType === EthereumDataType.INT);
    }
    case EthereumDataType.BOOL: {
      if (typeof value !== "boolean") throw new Error(`Not a boolean: ${String(value)}`);
      return new Uint8Array([value ? 1 : 0]);
    }
    case EthereumDataType.ADDRESS: {
      if (typeof value !== "string") throw new Error("Address must be a string");
      const b = hexToBytes(value, "Address");
      if (b.length !== 20) throw new Error(`Address must be 20 bytes, got ${b.length}`);
      return b;
    }
    case EthereumDataType.BYTES: {
      if (typeof value !== "string" && !(value instanceof Uint8Array)) {
        throw new Error("bytes must be hex or Uint8Array");
      }
      const b = value instanceof Uint8Array ? value : hexToBytes(value, "bytes");
      if (field.size !== undefined && b.length !== field.size) {
        throw new Error(`bytes${field.size} must be ${field.size} bytes, got ${b.length}`);
      }
      return field.size === undefined ? capLeaf(b, "bytes", maxBytes) : b;
    }
    case EthereumDataType.STRING: {
      if (typeof value !== "string") throw new Error("string field must be a string");
      return capLeaf(new TextEncoder().encode(value), "string", maxBytes);
    }
    default:
      throw new Error(`Cannot encode a ${EthereumDataType[field.dataType]} as a leaf value`);
  }
}

/** Big-endian uint16, the wire form of an array length. */
export function encodeArrayLength(len: number): Uint8Array {
  if (!Number.isInteger(len) || len < 0 || len > 0xffff) {
    throw new Error(`Array length out of range: ${len}`);
  }
  return new Uint8Array([(len >> 8) & 0xff, len & 0xff]);
}

export interface TypedDataDoc {
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  domain: Record<string, unknown>;
  message: Record<string, unknown>;
}

export type Resolved = { kind: "value"; field: FieldType; value: unknown } | { kind: "arrayLength"; length: number };

/**
 * Resolve a device-supplied member_path against the document.
 *
 * path[0] selects the root: 0 = domain, 1 = message. Every index after that
 * addresses either a member of the struct we are standing in, or an element of
 * the array we are standing in.
 *
 * A path that stops on an ARRAY is the device asking for its LENGTH; it will
 * ask for the elements next. A path that stops on a STRUCT is a protocol
 * error -- the device walks into structs, it never asks for one as a value.
 */
export function resolveMemberPath(doc: TypedDataDoc, path: number[]): Resolved {
  if (path.length === 0) throw new Error("Empty member_path");

  const root = path[0];
  if (root !== 0 && root !== 1) throw new Error(`Unknown member_path root: ${root}`);
  const rootType = root === 0 ? "EIP712Domain" : doc.primaryType;

  let field: FieldType = {
    dataType: EthereumDataType.STRUCT,
    structName: rootType,
    arrayLevels: [],
  };
  let value: unknown = root === 0 ? doc.domain : doc.message;
  // How many of `field.arrayLevels` we have already indexed through.
  let levelsUsed = 0;

  for (let i = 1; i < path.length; i++) {
    const index = path[i];

    if (levelsUsed < field.arrayLevels.length) {
      // Standing in an array: step into an element.
      const declared = field.arrayLevels[levelsUsed];
      if (!Array.isArray(value)) throw new Error(`Expected an array at path ${path.slice(0, i).join(".")}`);
      // A declared dimension is part of the TYPE STRING and therefore part of
      // typeHash. Serving three elements for an address[2] signs a document
      // whose type says two -- the device cannot notice, because it only ever
      // sees the count we give it.
      if (declared !== 0 && value.length !== declared) {
        throw new Error(`Fixed array declares ${declared} elements, document has ${value.length}`);
      }
      if (index >= value.length) throw new Error(`Array index ${index} out of range`);
      value = value[index];
      levelsUsed++;
      continue;
    }

    if (field.dataType !== EthereumDataType.STRUCT) {
      throw new Error(
        `Cannot descend into a ${EthereumDataType[field.dataType]} at path ${path.slice(0, i).join(".")}`
      );
    }

    const structName = field.structName!;
    const members = doc.types[structName];
    if (!members) throw new Error(`Unknown struct: ${structName}`);
    if (index >= members.length) throw new Error(`Member index ${index} out of range for ${structName}`);

    const member = members[index];
    field = parseSolidityType(member.type);
    levelsUsed = 0;
    if (typeof value !== "object" || value === null) {
      throw new Error(`Expected an object at path ${path.slice(0, i).join(".")}`);
    }
    value = (value as Record<string, unknown>)[member.name];
  }

  if (levelsUsed < field.arrayLevels.length) {
    const declared = field.arrayLevels[levelsUsed];
    if (!Array.isArray(value)) throw new Error("Expected an array for a length request");
    if (declared !== 0 && value.length !== declared) {
      throw new Error(`Fixed array declares ${declared} elements, document has ${value.length}`);
    }
    return { kind: "arrayLength", length: value.length };
  }
  if (field.dataType === EthereumDataType.STRUCT) {
    throw new Error("Device asked for a struct as a value; it should walk into it");
  }
  return { kind: "value", field, value };
}

/** The member list for one struct, in the shape EthereumTypedDataStructAck wants. */
export function structMembers(doc: TypedDataDoc, name: string): Array<{ name: string; type: FieldType }> {
  const members = doc.types[name];
  if (!members) throw new Error(`Unknown struct: ${name}`);
  return members.map((m) => ({ name: m.name, type: parseSolidityType(m.type) }));
}

/** One EthereumTypedDataValueAck: the value, or one chunk of a long one. */
export interface ValueAck {
  value: Uint8Array;
  /** First chunk of a value over MAX_LEAF_BYTES: the whole value's length. */
  totalLength?: number;
  /** A later chunk: echoes the offset the device asked for. */
  offset?: number;
}

/**
 * What the firmware does with a `bytes` or `string` value over MAX_LEAF_BYTES.
 *
 * - "legacy": before 7.16.0. Exactly the host that predates chunking: such a
 *   value fails to encode when the device asks for it, and value_offset is
 *   not read (that firmware never sends it).
 * - "refuse": 7.16.0 or later without CAPABILITY_EIP712_CHUNKED_VALUES. It
 *   skips the chunk fields and would hash the first chunk alone, so the value
 *   is refused before the document is sent.
 * - "chunk": 7.16.0 or later with the capability.
 */
export type LongValues = "legacy" | "refuse" | "chunk";

/** Why a value of `length` bytes under `root` (0 = domain, 1 = message) cannot
 *  be sent, or undefined if it can. Only for "refuse" and "chunk". */
function longValueRefusal(root: number, length: number, longValues: LongValues): string | undefined {
  if (length <= MAX_LEAF_BYTES) return undefined;
  if (root !== 1) {
    return `A domain value of ${length} bytes cannot be signed; the device takes at most ${MAX_LEAF_BYTES}`;
  }
  if (length > MAX_VALUE_BYTES) {
    return `A ${length}-byte value cannot be signed; the device takes at most ${MAX_VALUE_BYTES}`;
  }
  if (longValues !== "chunk") {
    return `A ${length}-byte value needs firmware that takes chunked values; this one takes at most ${MAX_LEAF_BYTES} bytes`;
  }
  return undefined;
}

/**
 * Refuse, before anything is sent, a document with a value the device cannot
 * take: a domain value over MAX_LEAF_BYTES, a message value over
 * MAX_VALUE_BYTES, or any value over MAX_LEAF_BYTES for "refuse". Does nothing
 * for "legacy". Values that do not encode are left for the walk to report.
 */
export function checkLongValues(doc: TypedDataDoc, longValues: LongValues): void {
  if (longValues === "legacy") return;
  const visit = (root: number, field: FieldType, levels: number, value: unknown): void => {
    if (levels < field.arrayLevels.length) {
      if (Array.isArray(value)) for (const v of value) visit(root, field, levels + 1, v);
      return;
    }
    if (field.dataType === EthereumDataType.STRUCT) {
      const members = doc.types[field.structName!];
      if (!members || typeof value !== "object" || value === null) return;
      for (const m of members) {
        let type: FieldType;
        try {
          type = parseSolidityType(m.type);
        } catch {
          continue;
        }
        visit(root, type, 0, (value as Record<string, unknown>)[m.name]);
      }
      return;
    }
    const dynamic =
      field.dataType === EthereumDataType.STRING || (field.dataType === EthereumDataType.BYTES && !field.size);
    if (!dynamic) return;
    let length: number;
    try {
      length = encodeValue(field, value, Number.MAX_SAFE_INTEGER).length;
    } catch {
      return;
    }
    const refusal = longValueRefusal(root, length, longValues);
    if (refusal) throw new Error(refusal);
  };
  const struct = (name: string): FieldType => ({
    dataType: EthereumDataType.STRUCT,
    structName: name,
    arrayLevels: [],
  });
  visit(0, struct("EIP712Domain"), 0, doc.domain);
  visit(1, struct(doc.primaryType), 0, doc.message);
}

/**
 * The answer to an EthereumTypedDataValueRequest for `path`, and `offset`
 * when the device names one.
 *
 * Up to MAX_LEAF_BYTES a value goes whole. For "chunk", a longer `bytes` or
 * `string` in the message goes in MAX_LEAF_BYTES chunks: the first carries
 * totalLength, each later request names an offset that its answer echoes.
 * The device reads a string twice from offset 0 (it counts and checks it
 * before showing it), so every chunk is served by its offset alone.
 */
export function answerValueRequest(
  doc: TypedDataDoc,
  path: number[],
  offset: number | undefined,
  longValues: LongValues
): ValueAck {
  const resolved = resolveMemberPath(doc, path);
  if (longValues === "legacy") {
    return {
      value:
        resolved.kind === "arrayLength"
          ? encodeArrayLength(resolved.length)
          : encodeValue(resolved.field, resolved.value),
    };
  }
  if (resolved.kind === "arrayLength") {
    if (offset !== undefined) throw new Error("Device asked for an array length in chunks");
    return { value: encodeArrayLength(resolved.length) };
  }
  const value = encodeValue(resolved.field, resolved.value, MAX_VALUE_BYTES);
  const refusal = longValueRefusal(path[0], value.length, longValues);
  if (refusal) throw new Error(refusal);
  if (offset !== undefined) {
    if (value.length <= MAX_LEAF_BYTES || offset >= value.length) {
      throw new Error(`Device asked for offset ${offset} of a ${value.length}-byte value`);
    }
    return { value: value.subarray(offset, offset + MAX_LEAF_BYTES), offset };
  }
  if (value.length <= MAX_LEAF_BYTES) return { value };
  return { value: value.subarray(0, MAX_LEAF_BYTES), totalLength: value.length };
}

/**
 * Drive a full structured EIP-712 signature.
 *
 * The DEVICE leads. It asks for one struct definition, or one leaf value, at a
 * time; this answers until it returns a signature. The host never decides the
 * order, which is the point: the device hashes what it displays, in the order
 * it chose, and a host that answered a different question would produce a
 * digest that does not verify.
 *
 * `call` is injected rather than taking a Transport, so the loop is testable
 * against a scripted device without USB.
 */
export interface Eip712Call {
  (messageType: number, payload: Uint8Array): Promise<{ type: number; payload: Uint8Array }>;
}

export interface Eip712Wire {
  SIGN: number;
  STRUCT_REQUEST: number;
  STRUCT_ACK: number;
  VALUE_REQUEST: number;
  VALUE_ACK: number;
  SIGNATURE: number;
  encodeSign(addressNList: number[], primaryType: string): Uint8Array;
  decodeStructRequest(payload: Uint8Array): string;
  encodeStructAck(members: Array<{ name: string; type: FieldType }>): Uint8Array;
  decodeValueRequest(payload: Uint8Array): { path: number[]; offset?: number };
  encodeValueAck(ack: ValueAck): Uint8Array;
  decodeSignature(payload: Uint8Array): { address: string; signature: string };
}

/** Guards against a device that never terminates the walk. */
const MAX_ROUND_TRIPS = 512;

export async function runEip712Walk(
  doc: TypedDataDoc,
  addressNList: number[],
  wire: Eip712Wire,
  call: Eip712Call,
  maxRoundTrips = MAX_ROUND_TRIPS,
  longValues: LongValues = "legacy"
): Promise<{ address: string; signature: string }> {
  let reply = await call(wire.SIGN, wire.encodeSign(addressNList, doc.primaryType));

  // The long value being read in chunks. Its offset requests are not round
  // trips, but a reading may have at most two per chunk (a string is read
  // twice), so a device that asks forever is still stopped.
  let reading: { path: string; offsetsLeft: number } | undefined;
  for (let i = 0; i < maxRoundTrips; ) {
    if (reply.type === wire.SIGNATURE) {
      return wire.decodeSignature(reply.payload);
    }

    if (reply.type === wire.STRUCT_REQUEST) {
      const name = wire.decodeStructRequest(reply.payload);
      // structMembers throws on an unknown struct rather than sending an empty
      // member list, which the device would hash as a valid empty struct.
      const members = structMembers(doc, name);
      i++;
      reply = await call(wire.STRUCT_ACK, wire.encodeStructAck(members));
      continue;
    }

    if (reply.type === wire.VALUE_REQUEST) {
      const request = wire.decodeValueRequest(reply.payload);
      const { path } = request;
      const key = path.join(".");
      const offset = longValues === "legacy" ? undefined : request.offset;
      if (offset === undefined) {
        i++;
        const ack = answerValueRequest(doc, path, undefined, longValues);
        const total = ack.totalLength;
        reading = total === undefined ? undefined : { path: key, offsetsLeft: 2 * Math.ceil(total / MAX_LEAF_BYTES) };
        reply = await call(wire.VALUE_ACK, wire.encodeValueAck(ack));
        continue;
      }
      if (!reading || reading.path !== key) {
        throw new Error(`Device asked for offset ${offset} of ${key}, which is not being sent in chunks`);
      }
      if (reading.offsetsLeft-- <= 0) throw new Error("Device asked for one value's chunks too many times");
      reply = await call(wire.VALUE_ACK, wire.encodeValueAck(answerValueRequest(doc, path, offset, longValues)));
      continue;
    }

    throw new Error(`Unexpected message ${reply.type} during EIP-712 walk`);
  }

  throw new Error("EIP-712 walk did not terminate");
}

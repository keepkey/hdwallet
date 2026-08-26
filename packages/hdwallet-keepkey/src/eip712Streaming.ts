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
 *  EIP712_MAX_LEAF on the device. Encoding past it produces a value that
 *  cannot be put on the wire, so catch it here where the error can name the
 *  field rather than at the transport layer where it cannot. */
export const MAX_LEAF_BYTES = 1024;

// Firmware uses the same 32-byte buffer for encodeType and the review title.
// Keeping identifiers to 31 ASCII bytes prevents either side from truncating
// a member name while the other side hashes it in full.
const MAX_IDENTIFIER_BYTES = 31;
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function requireIdentifier(name: unknown, what: string): string {
  if (typeof name !== "string" || !IDENTIFIER.test(name) || name.length > MAX_IDENTIFIER_BYTES) {
    throw new Error(`${what} must be a canonical EIP-712 identifier of at most ${MAX_IDENTIFIER_BYTES} bytes`);
  }
  return name;
}

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
  if (!IDENTIFIER.test(base) || base.length > MAX_IDENTIFIER_BYTES) {
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

function capLeaf(b: Uint8Array, what: string): Uint8Array {
  if (b.length > MAX_LEAF_BYTES) {
    throw new Error(`${what} value is ${b.length} bytes, over the ${MAX_LEAF_BYTES}-byte wire limit`);
  }
  return b;
}

/** One leaf, as the exact bytes the device will hash and display. */
export function encodeValue(field: FieldType, value: unknown): Uint8Array {
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
      return field.size === undefined ? capLeaf(b, "bytes") : b;
    }
    case EthereumDataType.STRING: {
      if (typeof value !== "string") throw new Error("string field must be a string");
      return capLeaf(new TextEncoder().encode(value), "string");
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
  requireIdentifier(name, "Struct name");
  const members = doc.types[name];
  if (!members) throw new Error(`Unknown struct: ${name}`);
  const seen = new Set<string>();
  return members.map((m) => {
    const memberName = requireIdentifier(m.name, `Member name in ${name}`);
    if (seen.has(memberName)) throw new Error(`Duplicate EIP-712 member ${name}.${memberName}`);
    seen.add(memberName);
    return { name: memberName, type: parseSolidityType(m.type) };
  });
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
  decodeValueRequest(payload: Uint8Array): number[];
  encodeValueAck(value: Uint8Array): Uint8Array;
  decodeSignature(payload: Uint8Array): { address: string; signature: string };
}

/** Guards against a device that never terminates the walk. */
const MAX_ROUND_TRIPS = 512;

export async function runEip712Walk(
  doc: TypedDataDoc,
  addressNList: number[],
  wire: Eip712Wire,
  call: Eip712Call
): Promise<{ address: string; signature: string }> {
  const primaryType = requireIdentifier(doc.primaryType, "Primary type");
  let reply = await call(wire.SIGN, wire.encodeSign(addressNList, primaryType));

  for (let i = 0; i < MAX_ROUND_TRIPS; i++) {
    if (reply.type === wire.SIGNATURE) {
      return wire.decodeSignature(reply.payload);
    }

    if (reply.type === wire.STRUCT_REQUEST) {
      const name = wire.decodeStructRequest(reply.payload);
      // structMembers throws on an unknown struct rather than sending an empty
      // member list, which the device would hash as a valid empty struct.
      const members = structMembers(doc, name);
      reply = await call(wire.STRUCT_ACK, wire.encodeStructAck(members));
      continue;
    }

    if (reply.type === wire.VALUE_REQUEST) {
      const path = wire.decodeValueRequest(reply.payload);
      const resolved = resolveMemberPath(doc, path);
      const bytes =
        resolved.kind === "arrayLength"
          ? encodeArrayLength(resolved.length)
          : encodeValue(resolved.field, resolved.value);
      reply = await call(wire.VALUE_ACK, wire.encodeValueAck(bytes));
      continue;
    }

    throw new Error(`Unexpected message ${reply.type} during EIP-712 walk`);
  }

  throw new Error("EIP-712 walk did not terminate");
}

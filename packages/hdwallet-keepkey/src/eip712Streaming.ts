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
      arrayLevels.push(m[1] === "" ? 0 : Number(m[1]));
      consumed = ARRAY_SUFFIX.lastIndex;
    }
    if (consumed !== suffix.length) throw new Error(`Malformed array type: ${type}`);
  }

  if (base === "string") return { dataType: EthereumDataType.STRING, arrayLevels };
  if (base === "bool") return { dataType: EthereumDataType.BOOL, arrayLevels };
  if (base === "address") return { dataType: EthereumDataType.ADDRESS, arrayLevels };
  if (base === "bytes") return { dataType: EthereumDataType.BYTES, arrayLevels };

  const bytesN = /^bytes(\d+)$/.exec(base);
  if (bytesN) {
    const n = Number(bytesN[1]);
    if (n < 1 || n > 32) throw new Error(`Invalid fixed bytes width: ${base}`);
    return { dataType: EthereumDataType.BYTES, size: n, arrayLevels };
  }

  const intN = /^(u?)int(\d*)$/.exec(base);
  if (intN) {
    // A bare "uint"/"int" is not canonical EIP-712. The old firmware accepted
    // it and hashed it verbatim as 256 bits, which produced a type string no
    // verifier reproduces. Refuse it here rather than pass it on.
    if (intN[2] === "") throw new Error(`Integer type must state its width: ${base}`);
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
      return b;
    }
    case EthereumDataType.STRING: {
      if (typeof value !== "string") throw new Error("string field must be a string");
      return new TextEncoder().encode(value);
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
      if (!Array.isArray(value)) throw new Error(`Expected an array at path ${path.slice(0, i).join(".")}`);
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
    if (!Array.isArray(value)) throw new Error("Expected an array for a length request");
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

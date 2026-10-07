import {
  answerValueRequest,
  checkLongValues,
  encodeArrayLength,
  encodeValue,
  EthereumDataType,
  FieldType,
  MAX_VALUE_BYTES,
  parseSolidityType,
  Resolved,
  resolveMemberPath,
  runEip712Walk,
  structMembers,
  TypedDataDoc,
  ValueAck,
} from "./eip712Streaming";

const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");

/** Narrow a Resolved to its value form, failing loudly if it is not one.
 *  Keeps assertions unconditional -- a guarded expect that never runs proves
 *  nothing and reads as if it did. */
function asValue(r: Resolved): { field: FieldType; value: unknown } {
  if (r.kind !== "value") throw new Error(`expected a leaf value, got ${r.kind}`);
  return { field: r.field, value: r.value };
}

describe("parseSolidityType", () => {
  it("parses atomics with their widths in bytes", () => {
    expect(parseSolidityType("uint256")).toEqual({ dataType: EthereumDataType.UINT, size: 32, arrayLevels: [] });
    expect(parseSolidityType("uint8")).toEqual({ dataType: EthereumDataType.UINT, size: 1, arrayLevels: [] });
    expect(parseSolidityType("int16")).toEqual({ dataType: EthereumDataType.INT, size: 2, arrayLevels: [] });
    expect(parseSolidityType("bytes32")).toEqual({ dataType: EthereumDataType.BYTES, size: 32, arrayLevels: [] });
    expect(parseSolidityType("bytes")).toEqual({ dataType: EthereumDataType.BYTES, arrayLevels: [] });
    expect(parseSolidityType("string")).toEqual({ dataType: EthereumDataType.STRING, arrayLevels: [] });
    expect(parseSolidityType("bool")).toEqual({ dataType: EthereumDataType.BOOL, arrayLevels: [] });
    expect(parseSolidityType("address")).toEqual({ dataType: EthereumDataType.ADDRESS, arrayLevels: [] });
  });

  it("records array levels in WRITTEN order", () => {
    // The order encodeType reproduces. Reversing it silently changes typeHash.
    expect(parseSolidityType("int16[2][][4]").arrayLevels).toEqual([2, 0, 4]);
    expect(parseSolidityType("address[]").arrayLevels).toEqual([0]);
    expect(parseSolidityType("Person[3]")).toEqual({
      dataType: EthereumDataType.STRUCT,
      structName: "Person",
      arrayLevels: [3],
    });
  });

  it("refuses a width-less integer", () => {
    // Not canonical EIP-712. The old firmware accepted it and hashed it as 256
    // bits, producing a type string no verifier reproduces.
    expect(() => parseSolidityType("uint")).toThrow(/width/);
    expect(() => parseSolidityType("int")).toThrow(/width/);
  });

  it("refuses malformed types rather than guessing", () => {
    expect(() => parseSolidityType("uint257")).toThrow();
    expect(() => parseSolidityType("uint255")).toThrow(); // not a multiple of 8
    expect(() => parseSolidityType("bytes33")).toThrow();
    expect(() => parseSolidityType("uint256[2]x")).toThrow(/Malformed/);
  });
});

describe("encodeValue", () => {
  it("encodes an unlimited approval, which the old path refused", () => {
    // strtoll capped the previous implementation at 2^63-1, so every unlimited
    // ERC-20 approval was unsignable. This is the exact value.
    const max = (BigInt(1) << BigInt(256)) - BigInt(1);
    const out = encodeValue(parseSolidityType("uint256"), max.toString());
    expect(hex(out)).toEqual("f".repeat(64));
  });

  it("encodes negative ints in two's complement at the declared width", () => {
    expect(hex(encodeValue(parseSolidityType("int16"), -2))).toEqual("fffe");
    expect(hex(encodeValue(parseSolidityType("int16"), 2))).toEqual("0002");
  });

  it("rejects values that do not fit the declared width", () => {
    expect(() => encodeValue(parseSolidityType("uint8"), 256)).toThrow(/out of range/);
    expect(() => encodeValue(parseSolidityType("uint8"), -1)).toThrow(/Negative/);
    expect(() => encodeValue(parseSolidityType("int8"), 128)).toThrow(/out of range/);
  });

  it("rejects a number that has already lost precision", () => {
    // Converting it would sign a value the caller never had.
    expect(() => encodeValue(parseSolidityType("uint256"), 2 ** 53)).toThrow(/safe integer/);
  });

  it("encodes address, bool, bytesN and string exactly", () => {
    expect(hex(encodeValue(parseSolidityType("address"), "0x" + "11".repeat(20)))).toEqual("11".repeat(20));
    expect(hex(encodeValue(parseSolidityType("bool"), true))).toEqual("01");
    expect(hex(encodeValue(parseSolidityType("bytes4"), "0xdeadbeef"))).toEqual("deadbeef");
    expect(hex(encodeValue(parseSolidityType("string"), "abc"))).toEqual("616263");
  });

  it("rejects a wrong-width address or bytesN", () => {
    expect(() => encodeValue(parseSolidityType("address"), "0x1234")).toThrow(/20 bytes/);
    expect(() => encodeValue(parseSolidityType("bytes4"), "0xdead")).toThrow(/4 bytes/);
  });
});

describe("encodeArrayLength", () => {
  it("is a big-endian uint16", () => {
    expect(hex(encodeArrayLength(0))).toEqual("0000");
    expect(hex(encodeArrayLength(258))).toEqual("0102");
    expect(() => encodeArrayLength(0x10000)).toThrow();
  });
});

// The payload that started all of this: PermitSingle nests PermitDetails, so a
// flat-structs-only implementation cannot sign a Uniswap approval.
const PERMIT2: TypedDataDoc = {
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    PermitDetails: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
      { name: "nonce", type: "uint48" },
    ],
    PermitSingle: [
      { name: "details", type: "PermitDetails" },
      { name: "spender", type: "address" },
      { name: "sigDeadline", type: "uint256" },
    ],
  },
  primaryType: "PermitSingle",
  domain: { name: "Permit2", chainId: 1, verifyingContract: "0x" + "22".repeat(20) },
  message: {
    details: {
      token: "0x" + "33".repeat(20),
      amount: "1461501637330902918203684832716283019655932542975", // 2^160-1
      expiration: 1700000000,
      nonce: 0,
    },
    spender: "0x" + "44".repeat(20),
    sigDeadline: 1700000000,
  },
};

describe("resolveMemberPath", () => {
  it("resolves domain leaves", () => {
    const r = resolveMemberPath(PERMIT2, [0, 0]);
    expect(r).toEqual({ kind: "value", field: parseSolidityType("string"), value: "Permit2" });
  });

  it("walks into a nested struct", () => {
    // [1, 0, 1] = message -> details -> amount
    const r = asValue(resolveMemberPath(PERMIT2, [1, 0, 1]));
    expect(r.field.size).toEqual(20); // uint160
    expect(hex(encodeValue(r.field, r.value))).toEqual("ff".repeat(20));
  });

  it("refuses to hand back a struct as a value", () => {
    // The device walks into structs; asking for one is a protocol error.
    expect(() => resolveMemberPath(PERMIT2, [1, 0])).toThrow(/walk into it/);
  });

  it("returns a length when the path stops on an array", () => {
    const doc: TypedDataDoc = {
      types: {
        EIP712Domain: [{ name: "name", type: "string" }],
        Batch: [{ name: "owners", type: "address[]" }],
      },
      primaryType: "Batch",
      domain: { name: "B" },
      message: { owners: ["0x" + "aa".repeat(20), "0x" + "bb".repeat(20)] },
    };
    expect(resolveMemberPath(doc, [1, 0])).toEqual({ kind: "arrayLength", length: 2 });
    const el = asValue(resolveMemberPath(doc, [1, 0, 1]));
    expect(hex(encodeValue(el.field, el.value))).toEqual("bb".repeat(20));
  });

  it("rejects an out-of-range index rather than signing undefined", () => {
    expect(() => resolveMemberPath(PERMIT2, [1, 99])).toThrow(/out of range/);
    expect(() => resolveMemberPath(PERMIT2, [2])).toThrow(/root/);
  });
});

describe("structMembers", () => {
  it("returns members in declaration order, which is signature-relevant", () => {
    const m = structMembers(PERMIT2, "PermitDetails");
    expect(m.map((x) => x.name)).toEqual(["token", "amount", "expiration", "nonce"]);
    expect(m[1].type).toEqual({ dataType: EthereumDataType.UINT, size: 20, arrayLevels: [] });
  });

  it("throws on an unknown struct", () => {
    expect(() => structMembers(PERMIT2, "Nope")).toThrow(/Unknown struct/);
  });
});

// ── regressions from the adversarial review ─────────────────────────
// Every case below was a confirmed defect in the first version of this module.

describe("non-canonical type spellings are refused, not normalised", () => {
  it("refuses a fixed array dimension of zero", () => {
    // 0 is the wire's DYNAMIC sentinel, so uint256[0] was being hashed as
    // uint256[] -- a different type string from the document's. Confirmed
    // against ethers 5.7.2: Foo(uint256[0] a) and Foo(uint256[] a) have
    // different hashStructs.
    expect(() => parseSolidityType("uint256[0]")).toThrow(/Malformed array dimension/);
  });

  it("refuses leading zeros in an array dimension", () => {
    expect(() => parseSolidityType("uint256[01]")).toThrow(/Malformed array dimension/);
  });

  it("refuses a non-canonical integer width", () => {
    // uint0256 normalised to 256 and was hashed as "uint256", while a verifier
    // reading the document sees "uint0256".
    expect(() => parseSolidityType("uint0256")).toThrow(/Non-canonical/);
    expect(() => parseSolidityType("int008")).toThrow(/Non-canonical/);
  });

  it("refuses a non-canonical bytesN width", () => {
    expect(() => parseSolidityType("bytes032")).toThrow(/Non-canonical/);
  });

  it("still accepts a struct whose name merely starts with int", () => {
    // The integer regex is anchored to digits so this is not caught by it.
    expect(parseSolidityType("interest")).toEqual({
      dataType: EthereumDataType.STRUCT,
      structName: "interest",
      arrayLevels: [],
    });
  });
});

describe("a declared fixed dimension is enforced", () => {
  const fixedDoc = (owners: string[]): TypedDataDoc => ({
    types: {
      EIP712Domain: [{ name: "name", type: "string" }],
      Batch: [{ name: "owners", type: "address[2]" }],
    },
    primaryType: "Batch",
    domain: { name: "B" },
    message: { owners },
  });

  it("refuses a document whose array is longer than its type says", () => {
    // The dimension is part of the type string and therefore part of typeHash.
    // Serving three elements for an address[2] signs a document whose type
    // declares two, and the device cannot notice -- it only sees the count we
    // give it.
    const doc = fixedDoc(["0x" + "aa".repeat(20), "0x" + "bb".repeat(20), "0x" + "cc".repeat(20)]);
    expect(() => resolveMemberPath(doc, [1, 0])).toThrow(/declares 2 elements, document has 3/);
    expect(() => resolveMemberPath(doc, [1, 0, 2])).toThrow(/declares 2 elements/);
  });

  it("refuses a document whose array is shorter than its type says", () => {
    const doc = fixedDoc(["0x" + "aa".repeat(20)]);
    expect(() => resolveMemberPath(doc, [1, 0])).toThrow(/declares 2 elements, document has 1/);
  });

  it("accepts the declared length", () => {
    const doc = fixedDoc(["0x" + "aa".repeat(20), "0x" + "bb".repeat(20)]);
    expect(resolveMemberPath(doc, [1, 0])).toEqual({ kind: "arrayLength", length: 2 });
  });

  it("leaves dynamic dimensions unchecked", () => {
    const doc: TypedDataDoc = {
      types: {
        EIP712Domain: [{ name: "name", type: "string" }],
        Batch: [{ name: "owners", type: "address[]" }],
      },
      primaryType: "Batch",
      domain: { name: "B" },
      message: { owners: ["0x" + "aa".repeat(20)] },
    };
    expect(resolveMemberPath(doc, [1, 0])).toEqual({ kind: "arrayLength", length: 1 });
  });
});

describe("dynamic leaves are capped at the wire limit", () => {
  it("refuses a string past MAX_LEAF_BYTES instead of building an unsendable value", () => {
    // EthereumTypedDataValueAck.value is max_size:1024. Encoding 2000 bytes
    // produced something that could not be sent, and the ceremony died at the
    // transport layer where the error could not name the field.
    expect(() => encodeValue(parseSolidityType("string"), "x".repeat(2000))).toThrow(/over the 1024-byte wire limit/);
  });

  it("refuses oversized dynamic bytes", () => {
    expect(() => encodeValue(parseSolidityType("bytes"), "0x" + "ab".repeat(2000))).toThrow(
      /over the 1024-byte wire limit/
    );
  });

  it("accepts exactly the limit", () => {
    expect(encodeValue(parseSolidityType("string"), "x".repeat(1024)).length).toEqual(1024);
  });
});

// ── the walk, driven against a scripted device ──────────────────────
//
// The device leads, so the only way to test the host half without hardware is
// to script a device and assert what the host answers. This models the exact
// sequence the firmware state machine produces for Permit2 PermitSingle:
// domain first, then the message, walking into PermitDetails.

describe("runEip712Walk", () => {
  const sent: ValueAck[] = [];
  beforeEach(() => {
    sent.length = 0;
  });
  const WIRE = {
    SIGN: 1704,
    STRUCT_REQUEST: 1705,
    STRUCT_ACK: 1706,
    VALUE_REQUEST: 1707,
    VALUE_ACK: 1708,
    SIGNATURE: 113,
    encodeSign: (n: number[], p: string) => new TextEncoder().encode(JSON.stringify({ n, p })),
    decodeStructRequest: (b: Uint8Array) => new TextDecoder().decode(b),
    encodeStructAck: (m: Array<{ name: string; type: FieldType }>) => new TextEncoder().encode(JSON.stringify(m)),
    decodeValueRequest: (b: Uint8Array) => {
      const r = JSON.parse(new TextDecoder().decode(b));
      return Array.isArray(r) ? { path: r as number[] } : (r as { path: number[]; offset?: number });
    },
    encodeValueAck: (ack: ValueAck) => {
      sent.push(ack);
      return ack.value;
    },
    decodeSignature: () => ({ address: "0xabc", signature: "0xsig" }),
  };

  /** A device that asks for exactly what the firmware would, in order. */
  function scriptedDevice(script: Array<{ type: number; payload: string }>) {
    const answers: Array<{ type: number; payload: Uint8Array }> = [];
    let i = 0;
    const call = async (type: number, payload: Uint8Array) => {
      answers.push({ type, payload });
      const step = script[i++];
      if (!step) return { type: WIRE.SIGNATURE, payload: new Uint8Array() };
      return { type: step.type, payload: new TextEncoder().encode(step.payload) };
    };
    return { call, answers };
  }

  it("answers every struct and value the device asks for, in order", async () => {
    const { call, answers } = scriptedDevice([
      { type: WIRE.STRUCT_REQUEST, payload: "EIP712Domain" },
      { type: WIRE.VALUE_REQUEST, payload: "[0,0]" }, // domain.name
      { type: WIRE.VALUE_REQUEST, payload: "[0,1]" }, // domain.chainId
      { type: WIRE.VALUE_REQUEST, payload: "[0,2]" }, // domain.verifyingContract
      { type: WIRE.STRUCT_REQUEST, payload: "PermitSingle" },
      { type: WIRE.STRUCT_REQUEST, payload: "PermitDetails" },
      { type: WIRE.VALUE_REQUEST, payload: "[1,0,0]" }, // details.token
      { type: WIRE.VALUE_REQUEST, payload: "[1,0,1]" }, // details.amount
    ]);

    const out = await runEip712Walk(PERMIT2, [44, 60, 0, 0, 0], WIRE, call);
    expect(out).toEqual({ address: "0xabc", signature: "0xsig" });

    // First message is the sign request, then one answer per device question.
    expect(answers[0].type).toEqual(WIRE.SIGN);
    expect(answers.slice(1).map((a) => a.type)).toEqual([
      WIRE.STRUCT_ACK,
      WIRE.VALUE_ACK,
      WIRE.VALUE_ACK,
      WIRE.VALUE_ACK,
      WIRE.STRUCT_ACK,
      WIRE.STRUCT_ACK,
      WIRE.VALUE_ACK,
      WIRE.VALUE_ACK,
    ]);

    // The nested uint160 came back as exactly 20 big-endian bytes of 0xff.
    const amount = answers[answers.length - 1].payload;
    expect(hex(amount)).toEqual("ff".repeat(20));
  });

  it("serves the declared member list for a nested struct", async () => {
    const { call, answers } = scriptedDevice([{ type: WIRE.STRUCT_REQUEST, payload: "PermitDetails" }]);
    await runEip712Walk(PERMIT2, [44], WIRE, call);
    const ack = JSON.parse(new TextDecoder().decode(answers[1].payload));
    expect(ack.map((m: { name: string }) => m.name)).toEqual(["token", "amount", "expiration", "nonce"]);
    expect(ack[1].type.size).toEqual(20); // uint160 in BYTES
  });

  it("refuses a struct the document does not define rather than sending an empty list", async () => {
    // An empty member list would hash as a valid empty struct, so the device
    // would sign a document neither side meant.
    const { call } = scriptedDevice([{ type: WIRE.STRUCT_REQUEST, payload: "Ghost" }]);
    await expect(runEip712Walk(PERMIT2, [44], WIRE, call)).rejects.toThrow(/Unknown struct: Ghost/);
  });

  it("rejects an unexpected message instead of continuing blindly", async () => {
    const { call } = scriptedDevice([{ type: 9999, payload: "" }]);
    await expect(runEip712Walk(PERMIT2, [44], WIRE, call)).rejects.toThrow(/Unexpected message 9999/);
  });

  const BLOB: TypedDataDoc = {
    types: {
      EIP712Domain: [{ name: "name", type: "string" }],
      Blob: [{ name: "data", type: "bytes" }],
    },
    primaryType: "Blob",
    domain: { name: "Blob" },
    message: { data: "0x" + "ab".repeat(2500) },
  };

  it("sends a value over 1 KB in chunks to firmware that takes them", async () => {
    const { call } = scriptedDevice([
      { type: WIRE.VALUE_REQUEST, payload: "[1,0]" },
      { type: WIRE.VALUE_REQUEST, payload: '{"path":[1,0],"offset":1024}' },
      { type: WIRE.VALUE_REQUEST, payload: '{"path":[1,0],"offset":2048}' },
    ]);
    await runEip712Walk(BLOB, [44], WIRE, call, undefined, "chunk");
    expect(sent.map((a) => [a.value.length, a.totalLength, a.offset])).toEqual([
      [1024, 2500, undefined],
      [1024, undefined, 1024],
      [452, undefined, 2048],
    ]);
  });

  it("refuses a value over 1 KB on 7.16 without the capability, sending no ack", async () => {
    // That firmware skips the chunk fields and would hash the first chunk.
    const { call } = scriptedDevice([{ type: WIRE.VALUE_REQUEST, payload: "[1,0]" }]);
    await expect(runEip712Walk(BLOB, [44], WIRE, call, undefined, "refuse")).rejects.toThrow(/chunked values/);
    expect(sent).toEqual([]);
  });

  it("below 7.16, fails a value over 1 KB as it always has and never reads an offset", async () => {
    const { call } = scriptedDevice([{ type: WIRE.VALUE_REQUEST, payload: "[1,0]" }]);
    await expect(runEip712Walk(BLOB, [44], WIRE, call)).rejects.toThrow(
      "bytes value is 2500 bytes, over the 1024-byte wire limit"
    );
    expect(sent).toEqual([]);
    const short = { ...BLOB, message: { data: "0xabcd" } };
    const again = scriptedDevice([{ type: WIRE.VALUE_REQUEST, payload: '{"path":[1,0],"offset":1024}' }]);
    await runEip712Walk(short, [44], WIRE, again.call);
    expect(sent).toEqual([{ value: new Uint8Array([0xab, 0xcd]) }]);
  });

  /** A 7.16 device reading [1,0]: whole once, then, for a string, again from 0. */
  function chunkReader(total: number, text: boolean) {
    const requests: Array<{ path: number[]; offset?: number }> = [{ path: [1, 0] }];
    for (let at = 1024; at < total; at += 1024) requests.push({ path: [1, 0], offset: at });
    if (text) for (let at = 0; at < total; at += 1024) requests.push({ path: [1, 0], offset: at });
    let i = 0;
    return async () => {
      const next = requests[i++];
      if (!next) return { type: WIRE.SIGNATURE, payload: new Uint8Array() };
      return { type: WIRE.VALUE_REQUEST, payload: new TextEncoder().encode(JSON.stringify(next)) };
    };
  }

  it("finishes a 1 MiB string: its offset requests are not round trips", async () => {
    const body = "z".repeat(MAX_VALUE_BYTES);
    const types = { ...BLOB.types, Blob: [{ name: "data", type: "string" }] };
    const doc = { ...BLOB, types, message: { data: body } };
    // Keep only what each ack says: every chunk is a view of a 1 MiB buffer.
    const acks: Array<[number, number | undefined, number | undefined]> = [];
    const wire = {
      ...WIRE,
      encodeValueAck: (ack: ValueAck) => {
        acks.push([ack.value.length, ack.totalLength, ack.offset]);
        return new Uint8Array();
      },
    };
    const out = await runEip712Walk(doc, [44], wire, chunkReader(MAX_VALUE_BYTES, true), undefined, "chunk");
    expect(out.signature).toBe("0xsig");
    // 1 + 1023 + 1024 acks, far past MAX_ROUND_TRIPS (512).
    expect(acks.length).toBe(2048);
    expect(acks[0]).toEqual([1024, MAX_VALUE_BYTES, undefined]);
    expect(acks[1024]).toEqual([1024, undefined, 0]);
    expect(acks.slice(1).every(([, total]) => total === undefined)).toBe(true);
    expect(acks.slice(1024).reduce((n, [length]) => n + length, 0)).toBe(MAX_VALUE_BYTES);
  }, 30000);

  it("stops a device that keeps asking for the same value's chunks", async () => {
    const call = async () => ({
      type: WIRE.VALUE_REQUEST,
      payload: new TextEncoder().encode(sent.length === 0 ? "[1,0]" : '{"path":[1,0],"offset":1024}'),
    });
    await expect(runEip712Walk(BLOB, [44], WIRE, call, undefined, "chunk")).rejects.toThrow(/too many times/);
    // The first chunk, then at most two readings of each of its three chunks.
    expect(sent.length).toBe(1 + 2 * 3);
  });

  it("refuses an offset for a value that is not being sent in chunks", async () => {
    const doc = {
      ...BLOB,
      types: {
        ...BLOB.types,
        Blob: [
          { name: "data", type: "bytes" },
          { name: "more", type: "bytes" },
        ],
      },
      message: { data: BLOB.message.data, more: BLOB.message.data },
    };
    const mismatched = scriptedDevice([
      { type: WIRE.VALUE_REQUEST, payload: "[1,0]" },
      { type: WIRE.VALUE_REQUEST, payload: '{"path":[1,1],"offset":1024}' },
    ]);
    await expect(runEip712Walk(doc, [44], WIRE, mismatched.call, undefined, "chunk")).rejects.toThrow(
      /offset 1024 of 1.1, which is not being sent in chunks/
    );
    const unasked = scriptedDevice([{ type: WIRE.VALUE_REQUEST, payload: '{"path":[1,0],"offset":1024}' }]);
    await expect(runEip712Walk(doc, [44], WIRE, unasked.call, undefined, "chunk")).rejects.toThrow(
      /not being sent in chunks/
    );
  });

  it("gives up rather than looping forever on a device that never finishes", async () => {
    const call = async () => ({
      type: WIRE.STRUCT_REQUEST,
      payload: new TextEncoder().encode("PermitDetails"),
    });
    await expect(runEip712Walk(PERMIT2, [44], WIRE, call)).rejects.toThrow(/did not terminate/);
  });
});

describe("answerValueRequest", () => {
  const DOC: TypedDataDoc = {
    types: {
      EIP712Domain: [{ name: "name", type: "string" }],
      Msg: [
        { name: "data", type: "bytes" },
        { name: "note", type: "string" },
        { name: "list", type: "uint8[]" },
      ],
    },
    primaryType: "Msg",
    domain: { name: "x".repeat(1025) },
    message: { data: "0x" + "ab".repeat(1025), note: "y".repeat(1024), list: [1] },
  };

  it("chunks only past 1 KB, and only on firmware that takes chunks", () => {
    expect(() => answerValueRequest(DOC, [1, 0], undefined, "refuse")).toThrow(/chunked values/);
    expect(() => answerValueRequest(DOC, [1, 0], undefined, "legacy")).toThrow(/over the 1024-byte wire limit/);
    const first = answerValueRequest(DOC, [1, 0], undefined, "chunk");
    expect([first.value.length, first.totalLength, first.offset]).toEqual([1024, 1025, undefined]);
    const last = answerValueRequest(DOC, [1, 0], 1024, "chunk");
    expect([hex(last.value), last.totalLength, last.offset]).toEqual(["ab", undefined, 1024]);
    // A string is read a second time from 0, and the 0 is echoed.
    const again = answerValueRequest(DOC, [1, 0], 0, "chunk");
    expect([again.value.length, again.totalLength, again.offset]).toEqual([1024, undefined, 0]);
    expect(() => answerValueRequest(DOC, [1, 0], 1025, "chunk")).toThrow(/offset 1025/);
    for (const mode of ["legacy", "refuse", "chunk"] as const) {
      const whole = answerValueRequest(DOC, [1, 1], undefined, mode);
      expect(whole).toEqual({ value: new TextEncoder().encode("y".repeat(1024)) });
    }
    expect(() => answerValueRequest(DOC, [1, 1], 0, "chunk")).toThrow(/offset 0 of a 1024-byte value/);
  });

  it("never chunks a domain value, an array length, or past the device's cap", () => {
    expect(() => answerValueRequest(DOC, [0, 0], undefined, "chunk")).toThrow(/domain/);
    expect(() => answerValueRequest(DOC, [1, 2], 0, "chunk")).toThrow(/array length/);
    const huge = { ...DOC, message: { ...DOC.message, data: "0x" + "00".repeat(MAX_VALUE_BYTES + 1) } };
    expect(() => answerValueRequest(huge, [1, 0], undefined, "chunk")).toThrow(/wire limit/);
  });
});

describe("checkLongValues", () => {
  const doc = (domainName: string, notes: string[]): TypedDataDoc => ({
    types: {
      EIP712Domain: [{ name: "name", type: "string" }],
      Outer: [{ name: "inner", type: "Inner[]" }],
      Inner: [{ name: "note", type: "string" }],
    },
    primaryType: "Outer",
    domain: { name: domainName },
    message: { inner: notes.map((note) => ({ note })) },
  });
  const long = "x".repeat(1025);

  it("finds a long value anywhere in the document", () => {
    expect(() => checkLongValues(doc("d", ["a", long]), "refuse")).toThrow(/chunked values/);
    expect(() => checkLongValues(doc("d", ["a", long]), "chunk")).not.toThrow();
    expect(() => checkLongValues(doc(long, []), "chunk")).toThrow(/domain value/);
    const huge = "x".repeat(MAX_VALUE_BYTES + 1);
    expect(() => checkLongValues(doc("d", [huge]), "chunk")).toThrow(/at most 1048576/);
  });

  it("changes nothing below 7.16, and leaves malformed values to the walk", () => {
    expect(() => checkLongValues(doc(long, [long]), "legacy")).not.toThrow();
    const bad = { ...doc("d", []), message: { inner: [{ note: 42 }] } };
    expect(() => checkLongValues(bad, "refuse")).not.toThrow();
  });
});

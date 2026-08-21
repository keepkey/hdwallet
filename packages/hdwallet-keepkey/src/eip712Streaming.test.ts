import {
  EthereumDataType,
  encodeArrayLength,
  encodeValue,
  parseSolidityType,
  resolveMemberPath,
  structMembers,
  TypedDataDoc,
} from "./eip712Streaming";

const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");

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
    const r = resolveMemberPath(PERMIT2, [1, 0, 1]);
    expect(r.kind).toEqual("value");
    if (r.kind === "value") {
      expect(r.field.size).toEqual(20); // uint160
      expect(hex(encodeValue(r.field, r.value))).toEqual("ff".repeat(20));
    }
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
    const el = resolveMemberPath(doc, [1, 0, 1]);
    expect(el.kind).toEqual("value");
    if (el.kind === "value") expect(hex(encodeValue(el.field, el.value))).toEqual("bb".repeat(20));
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

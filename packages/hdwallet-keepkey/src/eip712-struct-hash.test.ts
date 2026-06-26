/**
 * Known-answer regression test for the EIP-712 struct hashing used by
 * ethSignTypedData (domain separator + message hash sent to the firmware).
 *
 * These expected hashes were captured from @metamask/eth-sig-util's
 * TypedDataUtils.hashStruct(..., V4) and confirmed byte-identical to eip-712's
 * getStructHash before eth-sig-util was removed (PR swapping the two). They pin
 * the hashing so a future eip-712 bump that changes output fails loudly — the
 * hashes are what the device signs, so any drift is a signing-correctness bug.
 *
 * Coverage spans the V3↔V4 divergence points: nested structs (Permit2, Mail),
 * a struct array (Group → Person[], V4-only), and atomic array + dynamic bytes.
 */
import { getStructHash } from "eip-712";

const hex = (b: Uint8Array) => "0x" + Buffer.from(b).toString("hex");
const PERSON = [
  { name: "name", type: "string" },
  { name: "wallet", type: "address" },
];

const VECTORS: Record<string, { typedData: any; domain: string; message: string }> = {
  permit2: {
    typedData: {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        PermitSingle: [
          { name: "details", type: "PermitDetails" },
          { name: "spender", type: "address" },
          { name: "sigDeadline", type: "uint256" },
        ],
        PermitDetails: [
          { name: "token", type: "address" },
          { name: "amount", type: "uint160" },
          { name: "expiration", type: "uint48" },
          { name: "nonce", type: "uint48" },
        ],
      },
      primaryType: "PermitSingle",
      domain: { name: "Permit2", chainId: 1, verifyingContract: "0x000000000022D473030F116dDEE9F6B43aC78BA3" },
      message: {
        details: {
          token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          amount: "1000000000",
          expiration: "1735689600",
          nonce: "0",
        },
        spender: "0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD",
        sigDeadline: "1735689600",
      },
    },
    domain: "0x866a5aba21966af95d6c7ab78eb2b2fc913915c28be3b9aa07cc04ff903e3f28",
    message: "0x8c5e0f9cb48313e505efa2c4040320595098ae1eda6224aa7d007098fc2b5d08",
  },
  mail: {
    typedData: {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        Person: PERSON,
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
        ],
      },
      primaryType: "Mail",
      domain: {
        name: "Ether Mail",
        version: "1",
        chainId: 1,
        verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
      },
      message: {
        from: { name: "Cow", wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826" },
        to: { name: "Bob", wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB" },
        contents: "Hello, Bob!",
      },
    },
    domain: "0xf2cee375fa42b42143804025fc449deafd50cc031ca257e0b194a650a912090f",
    message: "0xc52c0ee5d84264471806290a3f2c4cecfc5490626bf912d01f240d7a274b371e",
  },
  // V4 struct array (Person[]) — the one place V3 and V4 diverge
  group: {
    typedData: {
      types: {
        EIP712Domain: [{ name: "name", type: "string" }],
        Person: PERSON,
        Group: [
          { name: "name", type: "string" },
          { name: "members", type: "Person[]" },
        ],
      },
      primaryType: "Group",
      domain: { name: "Grp" },
      message: {
        name: "devs",
        members: [
          { name: "A", wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826" },
          { name: "B", wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB" },
        ],
      },
    },
    domain: "0x5b2099c3e940e571b07b7102866068899e43ab61378bdf48e0d2247fff37d83a",
    message: "0x6e6d8c139490d2784993785a0eb5ed4f3077ada8dbc17fcb3d8f63939831bdac",
  },
  // atomic array (uint256[]) + dynamic bytes + bytes32 + bool
  atomics: {
    typedData: {
      types: {
        EIP712Domain: [{ name: "name", type: "string" }],
        Foo: [
          { name: "nums", type: "uint256[]" },
          { name: "data", type: "bytes" },
          { name: "hash", type: "bytes32" },
          { name: "flag", type: "bool" },
        ],
      },
      primaryType: "Foo",
      domain: { name: "Foo" },
      message: {
        nums: ["1", "2", "340282366920938463463374607431768211455"],
        data: "0xdeadbeef",
        hash: "0x" + "ab".repeat(32),
        flag: true,
      },
    },
    domain: "0x1f1a0521ee8101ffc6bbe7c3921c3850ba35af8a5806dfb5a3c36301c441854e",
    message: "0x1a1c1292140cb77ad00e71ab075674e1821444dc5eb5f4b5cc0b664ad35a37e8",
  },
};

describe("eip-712 getStructHash (EIP-712 V4) — known-answer", () => {
  for (const [name, v] of Object.entries(VECTORS)) {
    it(`${name}: domain separator + message hash match`, () => {
      expect(hex(getStructHash(v.typedData, "EIP712Domain", v.typedData.domain))).toBe(v.domain);
      expect(hex(getStructHash(v.typedData, v.typedData.primaryType, v.typedData.message))).toBe(v.message);
    });
  }
});

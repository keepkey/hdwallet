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
 *
 * Also covers namespaced primaryType names containing a colon (e.g. Hyperliquid's
 * "HyperliquidTransaction:ApproveAgent"). eip-712's dependency walker used to
 * truncate type names at the first non-word character (`/^\w+/`), so a colon-bearing
 * primaryType resolved to zero dependencies and crashed `encodeType` with
 * `Cannot read properties of undefined`. Fixed in patches/eip-712+1.0.0.patch —
 * this pins the fix so a future `yarn install` that drops the patch fails loudly.
 */
import { getDependencies, getStructHash } from "eip-712";

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
  // Hyperliquid's ApproveAgent dApp flow — primaryType contains a colon
  hyperliquidApproveAgent: {
    typedData: {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        "HyperliquidTransaction:ApproveAgent": [
          { name: "hyperliquidChain", type: "string" },
          { name: "agentAddress", type: "address" },
          { name: "agentName", type: "string" },
          { name: "nonce", type: "uint64" },
        ],
      },
      primaryType: "HyperliquidTransaction:ApproveAgent",
      domain: {
        name: "HyperliquidSignTransaction",
        version: "1",
        chainId: 421614,
        verifyingContract: "0x0000000000000000000000000000000000000000",
      },
      message: {
        hyperliquidChain: "Mainnet",
        agentAddress: "0x141d9959cae3853B035000490C03991Eb70Fc4AC",
        agentName: "BasedApp",
        nonce: "1783201736956",
      },
    },
    domain: "0xfeb1393ca4412a4ca577bd51d04f0a77033514c602f4d0a11490fb95f7428df6",
    message: "0xec6fab35f7f50d6033221926bbd0534179d89a17762e9cf505f65434a1dc4367",
  },
  // Confirms the fix is generic, not an ApproveAgent one-off — Hyperliquid has ~12
  // colon-namespaced action types (UsdSend, Withdraw, SpotSend, TokenDelegate, ...)
  // sharing this same primaryType convention; all go through the same code path.
  hyperliquidUsdSend: {
    typedData: {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        "HyperliquidTransaction:UsdSend": [
          { name: "hyperliquidChain", type: "string" },
          { name: "destination", type: "string" },
          { name: "amount", type: "string" },
          { name: "time", type: "uint64" },
        ],
      },
      primaryType: "HyperliquidTransaction:UsdSend",
      domain: {
        name: "HyperliquidSignTransaction",
        version: "1",
        chainId: 421614,
        verifyingContract: "0x0000000000000000000000000000000000000000",
      },
      message: {
        hyperliquidChain: "Mainnet",
        destination: "0x5e9ee1089755c3435139848e47e6635505d5a13",
        amount: "100.0",
        time: 1783201736956,
      },
    },
    domain: "0xfeb1393ca4412a4ca577bd51d04f0a77033514c602f4d0a11490fb95f7428df6",
    message: "0x1d706a53a98310840ea64551dff5d9cae877e7fbabcde155eb70138df9e11716",
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

describe("eip-712 getDependencies — colon-namespaced type names", () => {
  it("resolves a primaryType containing ':' instead of truncating at it", () => {
    const typedData = VECTORS.hyperliquidApproveAgent.typedData;
    expect(getDependencies(typedData, typedData.primaryType, {})).toEqual([typedData.primaryType]);
  });
});

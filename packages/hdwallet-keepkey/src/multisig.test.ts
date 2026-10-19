/**
 * Multisig protobuf packing.
 *
 * The risky part is xpubToHDNode's fixed byte offsets into the 78-byte BIP-32
 * serialization: get one wrong and the device silently derives different
 * pubkeys, builds a different script, and reports an address for a wallet that
 * does not exist. So the expected values here come from BIP-32's own test
 * vectors rather than from this implementation.
 */
import * as core from "@keepkey/hdwallet-core";

import { toProtoMultisig, xpubToHDNode } from "./bitcoin";

// BIP-32 test vector 1, chain m/0'/1 — the published serialization plus the
// field values it encodes.
const XPUB =
  "xpub6ASuArnXKPbfEwhqN6e3mwBcDTgzisQN1wXN9BJcM47sSikHjJf3UFHKkNAWbWMiGj7Wf5uMash7SyYq527Hqck2AxYysAA7xmALppuCkwQ";
const EXPECTED = {
  depth: 2,
  fingerprint: 0x5c1bd648,
  childNum: 1,
  chainCode: "2a7857631386ba23dacac34180dd1983734e444fdbf774041578e9b6adb37c19",
  publicKey: "03501e454bf00751f24b1b489aa925215d66af2234e3891c3b21a52bedb3cd711c",
};

describe("xpubToHDNode", () => {
  it("parses every field at the right offset", () => {
    const node = xpubToHDNode(XPUB);
    expect(node.getDepth()).toBe(EXPECTED.depth);
    expect(node.getFingerprint()).toBe(EXPECTED.fingerprint);
    expect(node.getChildNum()).toBe(EXPECTED.childNum);
    expect(core.toHexString(node.getChainCode_asU8())).toBe(EXPECTED.chainCode);
    expect(core.toHexString(node.getPublicKey_asU8())).toBe(EXPECTED.publicKey);
    // The device rejects anything but 33/32 — a compressed key and a full chain code.
    expect(node.getPublicKey_asU8().length).toBe(33);
    expect(node.getChainCode_asU8().length).toBe(32);
  });

  it("ignores SLIP-132 version bytes — same node, any flavour", () => {
    // Re-serialize under Zpub's magic; only the first 4 bytes change.
    const bs58check = require("bs58check");
    const raw = Buffer.from(bs58check.decode(XPUB));
    raw.writeUInt32BE(0x02aa7ed3, 0);
    const zpub = bs58check.encode(raw);
    expect(zpub.startsWith("Zpub")).toBe(true);
    expect(core.toHexString(xpubToHDNode(zpub).getPublicKey_asU8())).toBe(EXPECTED.publicKey);
  });

  it("refuses a malformed extended key rather than packing garbage", () => {
    expect(() => xpubToHDNode("xpubNOTVALID")).toThrow();
  });
});

describe("toProtoMultisig", () => {
  const ms: core.BTCMultisig = {
    m: 2,
    pubkeys: [
      { xpub: XPUB, addressNList: [0, 0] },
      { xpub: XPUB, addressNList: [0, 1] },
      { xpub: XPUB, addressNList: [1, 0] },
    ],
  };

  it("preserves pubkey order — the device does not sort", () => {
    const out = toProtoMultisig(ms);
    expect(out.getM()).toBe(2);
    expect(out.getPubkeysList().map((p: any) => p.getAddressNList())).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
    ]);
  });

  it("pads signatures to one slot per pubkey", () => {
    // OP_CHECKMULTISIG needs signatures in the same relative order as the keys,
    // so slots must line up positionally even when most are still empty.
    const out = toProtoMultisig({ ...ms, signatures: ["", "3006020101020101"] });
    const sigs = out.getSignaturesList_asU8 ? out.getSignaturesList_asU8() : out.getSignaturesList();
    expect(sigs.length).toBe(3);
    expect(core.toHexString(sigs[0])).toBe("");
    expect(core.toHexString(sigs[1])).toBe("3006020101020101");
    expect(core.toHexString(sigs[2])).toBe("");
  });

  it("defaults to all-empty signatures for an unsigned input", () => {
    const out = toProtoMultisig(ms);
    const sigs = out.getSignaturesList_asU8 ? out.getSignaturesList_asU8() : out.getSignaturesList();
    expect(sigs.length).toBe(3);
    expect(sigs.every((s: Uint8Array) => s.length === 0)).toBe(true);
  });
});

describe("multisig wire restrictions", () => {
  it("uses SPENDADDRESS for a legacy multisig account xpub, without changing signing types", async () => {
    const { KeepKeyHDWallet } = await import("./keepkey");
    const Types = await import("@keepkey/device-protocol/lib/types_pb");
    let request: any;
    const wallet = {
      transport: {
        call: async (_kind: any, msg: any) => {
          request = msg;
          return { proto: { getXpub: () => XPUB } };
        },
      },
    };
    const keys = await KeepKeyHDWallet.prototype.getPublicKeys.call(wallet as any, [
      {
        coin: "Bitcoin",
        curve: "secp256k1",
        addressNList: [0x80000030, 0x80000000, 0x80000000],
        scriptType: core.BTCInputScriptType.SpendMultisig,
      },
    ]);
    expect(request.getScriptType()).toBe(Types.InputScriptType.SPENDADDRESS);
    expect(keys[0]?.xpub).toBe(XPUB);
    const { translateInputScriptType } = await import("./utils");
    expect(translateInputScriptType(core.BTCInputScriptType.SpendMultisig)).toBe(Types.InputScriptType.SPENDMULTISIG);
  });
  it("refuses malformed threshold, suffixes and DER signature slots", () => {
    const ms: core.BTCMultisig = {
      m: 2,
      pubkeys: [
        { xpub: XPUB, addressNList: [0, 0] },
        { xpub: XPUB, addressNList: [1, 0] },
      ],
    };
    expect(() => toProtoMultisig({ ...ms, m: 3 })).toThrow();
    expect(() => toProtoMultisig({ ...ms, m: 1.5 })).toThrow();
    expect(() =>
      toProtoMultisig({ ...ms, pubkeys: [{ xpub: XPUB, addressNList: [0x80000000] }, ms.pubkeys[1]] })
    ).toThrow();
    expect(() => toProtoMultisig({ ...ms, signatures: ["300602010102010101"] })).toThrow();
    expect(() => toProtoMultisig({ ...ms, signatures: ["zz"] })).toThrow();
  });
});

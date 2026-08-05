import { BTCInputScriptType, describeUTXOPath, taprootAccount } from "./bitcoin";

describe("Bitcoin Taproot paths", () => {
  it("describes a BIP-86 account as Taproot", () => {
    const account = taprootAccount("Bitcoin", 0, 7);
    expect(account).toEqual({
      coin: "Bitcoin",
      scriptType: BTCInputScriptType.SpendTaproot,
      addressNList: [0x80000000 + 86, 0x80000000, 0x80000000 + 7],
    });
    expect(describeUTXOPath(account.addressNList, "Bitcoin", BTCInputScriptType.SpendTaproot)).toMatchObject({
      coin: "Bitcoin",
      accountIdx: 7,
      wholeAccount: true,
      isKnown: true,
      scriptType: BTCInputScriptType.SpendTaproot,
      verbose: "Bitcoin Account #7 (Taproot)",
    });
  });

  it("does not describe BIP-86 with another script type", () => {
    const path = [0x80000000 + 86, 0x80000000, 0x80000000];
    expect(describeUTXOPath(path, "Bitcoin", BTCInputScriptType.SpendWitness).isKnown).toBe(false);
  });
});

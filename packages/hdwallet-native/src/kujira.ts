import { StdTx } from "@cosmjs/amino";
import { SignerData } from "@cosmjs/stargate";
import * as core from "@keepkey/hdwallet-core";
import * as bech32 from "bech32";
import CryptoJS from "crypto-js";
import PLazy from "p-lazy";

import * as Isolation from "./crypto/isolation";
import { NativeHDWalletBase } from "./native";
import * as util from "./util";

const KUJIRA_CHAIN = "kaiyo-1";

const protoTxBuilder = PLazy.from(() => import("@keepkey/proto-tx-builder"));

export function MixinNativeKujiraWalletInfo<TBase extends core.Constructor<core.HDWalletInfo>>(Base: TBase) {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  return class MixinNativeKujiraWalletInfo extends Base implements core.KujiraWalletInfo {
    readonly _supportsKujiraInfo = true;
    async kujiraSupportsNetwork(): Promise<boolean> {
      return true;
    }

    async kujiraSupportsSecureTransfer(): Promise<boolean> {
      return false;
    }

    kujiraSupportsNativeShapeShift(): boolean {
      return false;
    }

    kujiraGetAccountPaths(msg: core.KujiraGetAccountPaths): Array<core.KujiraAccountPath> {
      const slip44 = core.slip44ByCoin("Kuji");
      return [
        {
          addressNList: [0x80000000 + 44, 0x80000000 + slip44, 0x80000000 + msg.accountIdx, 0, 0],
        },
      ];
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    kujiraNextAccountPath(msg: core.KujiraAccountPath): core.KujiraAccountPath | undefined {
      // Only support one account for now.
      return undefined;
    }
  };
}

export function MixinNativeKujiraWallet<TBase extends core.Constructor<NativeHDWalletBase>>(Base: TBase) {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  return class MixinNativeKujiraWallet extends Base {
    readonly _supportsKujira = true;

    #masterKey: Isolation.Core.BIP32.Node | undefined;

    async kujiraInitializeWallet(masterKey: Isolation.Core.BIP32.Node): Promise<void> {
      this.#masterKey = masterKey;
    }

    kujiraWipe(): void {
      this.#masterKey = undefined;
    }

    kujiraBech32ify(address: ArrayLike<number>, prefix: string): string {
      const words = bech32.toWords(address);
      return bech32.encode(prefix, words);
    }

    createKujiraAddress(publicKey: string) {
      const message = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(publicKey));
      const hash = CryptoJS.RIPEMD160(message as any).toString();
      const address = Buffer.from(hash, `hex`);
      return this.kujiraBech32ify(address, `kujira`);
    }

    async kujiraGetAddress(msg: core.KujiraGetAddress): Promise<string | null> {
      return this.needsMnemonic(!!this.#masterKey, async () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const keyPair = await util.getKeyPair(this.#masterKey!, msg.addressNList, "kujira");
        return this.createKujiraAddress(keyPair.publicKey.toString("hex"));
      });
    }

    async kujiraSignTx(msg: core.KujiraSignTx): Promise<core.CosmosSignedTx | null> {
      return this.needsMnemonic(!!this.#masterKey, async () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const keyPair = await util.getKeyPair(this.#masterKey!, msg.addressNList, "osmosis");
        const adapter = await Isolation.Adapters.CosmosDirect.create(keyPair.node, "osmo");

        const signerData: SignerData = {
          sequence: Number(msg.sequence),
          accountNumber: Number(msg.account_number),
          chainId: KUJIRA_CHAIN,
        };
        return (await protoTxBuilder).sign(adapter.address, msg.tx as StdTx, adapter, signerData);
      });
    }
  };
}

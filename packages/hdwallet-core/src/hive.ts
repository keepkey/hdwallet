import { BIP32Path, HDWallet } from "./wallet";

export interface HiveGetPublicKey {
  addressNList: BIP32Path;
  showDisplay?: boolean;
}

export interface HivePublicKey {
  publicKey: string;
  rawPublicKey?: Uint8Array;
}

export interface HiveSignTx {
  addressNList: BIP32Path;
  chainId?: Uint8Array | string;
  refBlockNum: number;
  refBlockPrefix: number;
  expiration: number;
  from: string;
  to: string;
  amount: number;
  decimals?: number;
  assetSymbol: string;
  memo?: string;
}

export interface HiveSignedTx {
  signature: Uint8Array;
  serializedTx: Uint8Array;
}

export interface HiveWallet extends HDWallet {
  readonly _supportsHive: boolean;
  hiveGetPublicKey(msg: HiveGetPublicKey): Promise<HivePublicKey | null>;
  hiveSignTx(msg: HiveSignTx): Promise<HiveSignedTx | null>;
}

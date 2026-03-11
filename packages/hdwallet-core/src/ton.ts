import { BIP32Path, HDWallet, HDWalletInfo } from "./wallet";

export interface TonGetAddress {
  addressNList: BIP32Path;
  showDisplay?: boolean;
  bounceable?: boolean;
  testnet?: boolean;
  workchain?: number;
}

export interface TonAddress {
  address: string;
  rawAddress?: string;
}

export interface TonSignTx {
  addressNList: BIP32Path;
  rawTx: Uint8Array | string;
  expireAt?: number;
  seqno?: number;
  workchain?: number;
  toAddress?: string;
  amount?: string; // nanoTON as string (uint64)
}

export interface TonSignedTx {
  signature: Uint8Array | string;
}

export interface TonGetAccountPaths {
  accountIdx: number;
}

export interface TonAccountPath {
  addressNList: BIP32Path;
}

export interface TonWalletInfo extends HDWalletInfo {
  readonly _supportsTonInfo: boolean;
  tonGetAccountPaths(msg: TonGetAccountPaths): Array<TonAccountPath>;
  tonNextAccountPath(msg: TonAccountPath): TonAccountPath | undefined;
}

export interface TonWallet extends TonWalletInfo, HDWallet {
  readonly _supportsTon: boolean;
  tonGetAddress(msg: TonGetAddress): Promise<string | null>;
  tonSignTx(msg: TonSignTx): Promise<TonSignedTx | null>;
}

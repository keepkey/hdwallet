import { BIP32Path, HDWallet, HDWalletInfo } from "./wallet";

export interface TronGetAddress {
  addressNList: BIP32Path;
  showDisplay?: boolean;
}

export interface TronAddress {
  address: string;
}

export interface TronSignTx {
  addressNList: BIP32Path;
  rawTx: Uint8Array | string;
  toAddress?: string;   // Destination address — enables clear-sign on device
  amount?: string;      // Amount in SUN (string to avoid precision loss) — enables clear-sign on device
}

export interface TronSignedTx {
  signature: Uint8Array | string;
}

export interface TronGetAccountPaths {
  accountIdx: number;
}

export interface TronAccountPath {
  addressNList: BIP32Path;
}

export interface TronWalletInfo extends HDWalletInfo {
  readonly _supportsTronInfo: boolean;
  tronGetAccountPaths(msg: TronGetAccountPaths): Array<TronAccountPath>;
  tronNextAccountPath(msg: TronAccountPath): TronAccountPath | undefined;
}

export interface TronWallet extends TronWalletInfo, HDWallet {
  readonly _supportsTron: boolean;
  tronGetAddress(msg: TronGetAddress): Promise<string | null>;
  tronSignTx(msg: TronSignTx): Promise<TronSignedTx | null>;
}

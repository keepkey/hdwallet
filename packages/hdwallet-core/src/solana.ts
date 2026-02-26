import { BIP32Path, HDWallet, HDWalletInfo } from "./wallet";

export interface SolanaGetAddress {
  addressNList: BIP32Path;
  showDisplay?: boolean;
}

export interface SolanaAddress {
  address: string;
}

export interface SolanaSignTx {
  addressNList: BIP32Path;
  rawTx: Uint8Array | string;
}

export interface SolanaSignedTx {
  signature: Uint8Array | string;
}

export interface SolanaGetAccountPaths {
  accountIdx: number;
}

export interface SolanaAccountPath {
  addressNList: BIP32Path;
}

export interface SolanaWalletInfo extends HDWalletInfo {
  readonly _supportsSolanaInfo: boolean;
  solanaGetAccountPaths(msg: SolanaGetAccountPaths): Array<SolanaAccountPath>;
  solanaNextAccountPath(msg: SolanaAccountPath): SolanaAccountPath | undefined;
}

export interface SolanaWallet extends SolanaWalletInfo, HDWallet {
  readonly _supportsSolana: boolean;
  solanaGetAddress(msg: SolanaGetAddress): Promise<string | null>;
  solanaSignTx(msg: SolanaSignTx): Promise<SolanaSignedTx | null>;
}

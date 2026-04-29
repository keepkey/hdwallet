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

// ── Off-chain message signing (domain-separated envelope) ────────────

export interface SolanaSignOffchainMessage {
  addressNList: BIP32Path;
  /** Off-chain message spec version. Only 0 is currently defined. */
  version?: number;
  /** 0 = restricted ASCII, 1 = UTF-8 limited (max 1212 bytes). Format 2 is not supported on KeepKey. */
  messageFormat?: number;
  message: Uint8Array | string;
  showDisplay?: boolean;
}

export interface SolanaOffchainMessageSignature {
  publicKey: Uint8Array | string;
  signature: Uint8Array | string;
}

export interface SolanaWallet extends SolanaWalletInfo, HDWallet {
  readonly _supportsSolana: boolean;
  solanaGetAddress(msg: SolanaGetAddress): Promise<string | null>;
  solanaSignTx(msg: SolanaSignTx): Promise<SolanaSignedTx | null>;
  solanaSignOffchainMessage(msg: SolanaSignOffchainMessage): Promise<SolanaOffchainMessageSignature | null>;
}

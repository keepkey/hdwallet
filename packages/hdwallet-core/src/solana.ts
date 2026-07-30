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
  /** One-request opaque-signing authorization; does not mutate AdvancedMode. */
  allowBlindSigning?: boolean;
  /** Transaction-bound, signer-attested KKSOLSW1 swap descriptor. */
  swapMetadata?: {
    payload: Uint8Array | string;
    signature: Uint8Array | string;
    signerKeyId: number;
  };
  /**
   * Signer-attested KKSOLSC1 instruction schema. Unlike swapMetadata this is
   * NOT bound to one transaction: it describes how to read a program's
   * instruction, so a single signature is reused for every transaction to
   * that program and the device decodes values from the bytes it signs.
   */
  schema?: {
    payload: Uint8Array | string;
    signature: Uint8Array | string;
    signerKeyId: number;
  };
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

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
  toAddress?: string; // Destination address — enables clear-sign on device
  amount?: string; // Amount in SUN (string to avoid precision loss) — enables clear-sign on device
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

// ── TIP-191 personal_sign ─────────────────────────────────────────────

export interface TronSignMessage {
  addressNList: BIP32Path;
  message: Uint8Array | string;
  showDisplay?: boolean;
}

export interface TronMessageSignature {
  address: string;
  signature: Uint8Array | string;
}

export interface TronVerifyMessage {
  address: string;
  signature: Uint8Array | string;
  message: Uint8Array | string;
}

// ── TIP-712 typed-data hash mode ──────────────────────────────────────

export interface TronSignTypedHash {
  addressNList: BIP32Path;
  /** 32-byte domainSeparator hash (host-precomputed per TIP-712 spec) */
  domainSeparatorHash: Uint8Array | string;
  /** 32-byte message hash; omit for primaryType=EIP712Domain */
  messageHash?: Uint8Array | string;
}

export interface TronTypedDataSignature {
  address: string;
  signature: Uint8Array | string;
}

export interface TronWallet extends TronWalletInfo, HDWallet {
  readonly _supportsTron: boolean;
  tronGetAddress(msg: TronGetAddress): Promise<string | null>;
  tronSignTx(msg: TronSignTx): Promise<TronSignedTx | null>;
  tronSignMessage(msg: TronSignMessage): Promise<TronMessageSignature | null>;
  tronVerifyMessage(msg: TronVerifyMessage): Promise<boolean>;
  tronSignTypedHash(msg: TronSignTypedHash): Promise<TronTypedDataSignature | null>;
}

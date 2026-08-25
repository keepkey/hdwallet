import { BIP32Path, HDWallet, HDWalletInfo } from "./wallet";

export interface SolanaGetAddress {
  addressNList: BIP32Path;
  showDisplay?: boolean;
}

export interface SolanaAddress {
  address: string;
}

export interface SolanaTokenInfo {
  /** 32-byte SPL mint, encoded as bytes, hex, base64, or base58. */
  mint: Uint8Array | string;
  symbol?: string;
  decimals?: number;
  signature?: Uint8Array | string;
  signerKeyId?: number;
}

export interface SolanaSignTx {
  addressNList: BIP32Path;
  rawTx: Uint8Array | string;
  /** Optional token definitions used by firmware display policy. */
  tokenInfo?: SolanaTokenInfo[];
  /**
   * Candidate owners for signed SPL token destinations (for example x402
   * payTo). Firmware displays one only after deriving and matching its ATA.
   */
  tokenRecipientOwners?: Array<Uint8Array | string>;
  /** One-request opaque-signing authorization; does not mutate AdvancedMode. */
  allowBlindSigning?: boolean;
  /**
   * Transaction-bound, signer-attested resolution of the Address Lookup
   * Table accounts this exact message references (KKSOLSW1). `accounts` is
   * the raw canonical account list: all writable lookup keys, then all
   * readonly lookup keys, in lookup-table/index order — max 8. Firmware
   * verifies `signature` (64-byte compact secp256k1) over
   * SHA256("KeepKeySolanaTxAccounts/1" || message_hash(32) || count(LE32) ||
   * account[0..count-1]).
   *
   * `signerKeyId` is a runtime clear-sign signer slot (0-3) for the
   * annotation-only path (Advanced Mode still required), or the certified
   * delegate sentinel 0x80 when `certificate` is also set on the request.
   */
  lutProof?: {
    accounts: Array<Uint8Array | string>;
    signature: Uint8Array | string;
    signerKeyId: number;
  };
  /**
   * Signer-attested KKSOLSC1 instruction schema. Unlike lutProof this is
   * NOT bound to one transaction: it describes how to read a program's
   * instruction, so a single signature is reused for every transaction to
   * that program and the device decodes values from the bytes it signs.
   */
  schema?: {
    payload: Uint8Array | string;
    signature: Uint8Array | string;
    signerKeyId: number;
  };
  /**
   * 139-byte KeepKey root certificate authorizing the delegate that signed
   * `schema` and, when present, `lutProof`. Required for the certified path —
   * schema.signerKeyId and any present lutProof.signerKeyId MUST be 0x80.
   * Self-contained legacy/v0 messages intentionally omit lutProof because all
   * instruction accounts are already committed by rawTx.
   */
  certificate?: Uint8Array | string;
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

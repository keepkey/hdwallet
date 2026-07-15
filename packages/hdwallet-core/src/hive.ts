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

/** Keychain signBuffer contract: sign SHA256(message bytes) — no chain_id, no prefix. */
export interface HiveSignMessage {
  addressNList: BIP32Path;
  message: Uint8Array;
}

export interface HiveSignedMessage {
  /** 65-byte compact recoverable signature (27+recid+4, r, s) */
  signature: Uint8Array;
  /** 33-byte compressed public key of the signing key */
  publicKey: Uint8Array;
}

/** Generic parsed-op signing: host-serialized Graphene tx bytes; firmware
 *  parses + clear-signs vote/comment/custom_json, rejects everything else. */
export interface HiveSignOperations {
  addressNList: BIP32Path;
  chainId?: Uint8Array | string;
  serializedTx: Uint8Array;
}

export interface HiveSignedOperations {
  signature: Uint8Array;
}

// ── SLIP-0048 path helper ──────────────────────────────────────────────
// Hive uses SLIP-0048: m/48'/13'/role'/account'/0' (all 5 hardened). Must match
// firmware (hive.h HIVE_SLIP48_*), Ledger, and Hive Keychain.
export const HIVE_ROLE = { owner: 0, active: 1, memo: 3, posting: 4 } as const;
export type HiveRole = keyof typeof HIVE_ROLE;

export function hiveSlip48Path(role: HiveRole, accountIndex = 0): BIP32Path {
  return [0x80000030, 0x8000000d, 0x80000000 + HIVE_ROLE[role], 0x80000000 + accountIndex, 0x80000000];
}

// ── Multi-key fetch (all four role keys in one device interaction) ──────
export interface HiveGetPublicKeys {
  accountIndex?: number; // default 0
  showDisplay?: boolean;
}

export interface HivePublicKeys {
  ownerKey: string;
  activeKey: string;
  memoKey: string;
  postingKey: string;
}

// ── account_create (op 9) — sponsor-funded new account ──────────────────
export interface HiveSignAccountCreate {
  addressNList: BIP32Path; // owner key path: m/48'/13'/0'/account'/0'
  chainId?: Uint8Array | string;
  refBlockNum: number;
  refBlockPrefix: number;
  expiration: number;
  creator: string; // sponsor account name
  newAccountName: string;
  ownerKey: string;
  activeKey: string;
  postingKey: string;
  memoKey: string;
  feeAmount: number; // milliHIVE (3000 = 3.000 HIVE)
}

export interface HiveSignedAccountCreate {
  signature: Uint8Array;
  serializedTx: Uint8Array;
}

// ── account_update (op 10) — secure an existing account (Flow B) ────────
export interface HiveSignAccountUpdate {
  addressNList: BIP32Path; // owner key path
  chainId?: Uint8Array | string;
  refBlockNum: number;
  refBlockPrefix: number;
  expiration: number;
  account: string;
  newOwnerKey: string;
  newActiveKey: string;
  newPostingKey: string;
  newMemoKey: string;
}

export interface HiveSignedAccountUpdate {
  signature: Uint8Array;
  serializedTx: Uint8Array;
}

export interface HiveWallet extends HDWallet {
  readonly _supportsHive: boolean;
  hiveGetPublicKey(msg: HiveGetPublicKey): Promise<HivePublicKey | null>;
  hiveGetPublicKeys(msg: HiveGetPublicKeys): Promise<HivePublicKeys | null>;
  hiveSignTx(msg: HiveSignTx): Promise<HiveSignedTx | null>;
  hiveSignMessage(msg: HiveSignMessage): Promise<HiveSignedMessage | null>;
  hiveSignOperations(msg: HiveSignOperations): Promise<HiveSignedOperations | null>;
  hiveSignAccountCreate(msg: HiveSignAccountCreate): Promise<HiveSignedAccountCreate | null>;
  hiveSignAccountUpdate(msg: HiveSignAccountUpdate): Promise<HiveSignedAccountUpdate | null>;
}

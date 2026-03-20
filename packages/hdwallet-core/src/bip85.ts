export interface Bip85GetMnemonicMsg {
  wordCount: 12 | 18 | 24;
  index: number;
}

/** Firmware displays the seed on-device only; nothing is returned over USB. */
export interface Bip85DisplayResult {
  displayed: boolean;
}

/** @deprecated Firmware no longer sends mnemonic over USB. Use Bip85DisplayResult. */
export interface Bip85Mnemonic {
  mnemonic: string;
}

export interface Bip85Wallet {
  readonly _supportsBip85: boolean;
  bip85GetMnemonic(msg: Bip85GetMnemonicMsg): Promise<Bip85DisplayResult>;
}

export function supportsBip85(wallet: any): wallet is Bip85Wallet {
  return wallet?._supportsBip85 === true;
}

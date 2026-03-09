export interface Bip85GetMnemonicMsg {
  wordCount: 12 | 18 | 24
  index: number
}

export interface Bip85Mnemonic {
  mnemonic: string
}

export interface Bip85Wallet {
  readonly _supportsBip85: boolean
  bip85GetMnemonic(msg: Bip85GetMnemonicMsg): Promise<Bip85Mnemonic>
}

export function supportsBip85(wallet: any): wallet is Bip85Wallet {
  return wallet?._supportsBip85 === true
}

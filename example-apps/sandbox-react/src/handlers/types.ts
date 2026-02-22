import type { HDWallet } from "@keepkey/hdwallet-core";

export type SetResult = (section: string, value: string) => void;

export type WalletHandlers = {
  wallet: HDWallet | null;
  setResult: SetResult;
};

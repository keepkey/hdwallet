import * as core from "@keepkey/hdwallet-core";
import type { HDWallet } from "@keepkey/hdwallet-core";

export async function pressYes(wallet: HDWallet | null) {
  if (!wallet || !core.supportsDebugLink(wallet)) return;
  await wallet.pressYes();
}

export async function pressNo(wallet: HDWallet | null) {
  if (!wallet || !core.supportsDebugLink(wallet)) return;
  await wallet.pressNo();
}

export async function cancel(wallet: HDWallet | null) {
  if (!wallet) return;
  await wallet.cancel();
}

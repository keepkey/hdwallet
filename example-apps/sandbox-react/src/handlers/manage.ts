import * as core from "@keepkey/hdwallet-core";
import type { HDWallet } from "@keepkey/hdwallet-core";
import type { SetResult } from "./types";

export async function getVendor(wallet: HDWallet | null, setResult: SetResult, section: string) {
  if (!wallet) {
    setResult(section, "No wallet?");
    return;
  }
  const v = await wallet.getVendor();
  setResult(section, v);
}

export async function getModel(wallet: HDWallet | null, setResult: SetResult, section: string) {
  if (!wallet) {
    setResult(section, "No wallet?");
    return;
  }
  const v = await wallet.getModel();
  setResult(section, v);
}

export async function getDeviceID(wallet: HDWallet | null, setResult: SetResult, section: string) {
  if (!wallet) {
    setResult(section, "No wallet?");
    return;
  }
  const v = await wallet.getDeviceID();
  setResult(section, v);
}

export async function getFirmware(wallet: HDWallet | null, setResult: SetResult, section: string) {
  if (!wallet) {
    setResult(section, "No wallet?");
    return;
  }
  const v = await wallet.getFirmwareVersion();
  setResult(section, v);
}

export async function getLabel(wallet: HDWallet | null, setResult: SetResult, section: string) {
  if (!wallet) {
    setResult(section, "No wallet?");
    return;
  }
  const v = await wallet.getLabel();
  setResult(section, v);
}

const btcGetPublicKeysInput = [
  { coin: "Bitcoin", addressNList: [2147483732, 2147483648, 2147483648], curve: "secp256k1", scriptType: core.BTCInputScriptType.SpendWitness },
  { coin: "Bitcoin", addressNList: [2147483697, 2147483648, 2147483648], curve: "secp256k1", scriptType: core.BTCInputScriptType.SpendP2SHWitness },
  { coin: "Bitcoin", addressNList: [2147483692, 2147483648, 2147483648], curve: "secp256k1", scriptType: core.BTCInputScriptType.SpendAddress },
];
const bchGetPublicKeysInput = [
  { addressNList: [0x80000000 + 44, 0x80000000 + 145, 0x80000000 + 0], curve: "secp256k1", showDisplay: true, coin: "BitcoinCash", scriptType: core.BTCInputScriptType.SpendAddress },
];
const ltcGetPublicKeysInput = [
  { addressNList: [2147483732, 2147483650, 2147483648], curve: "secp256k1", showDisplay: true, coin: "Litecoin", scriptType: core.BTCInputScriptType.SpendWitness },
  { addressNList: [2147483697, 2147483650, 2147483648], curve: "secp256k1", showDisplay: true, coin: "Litecoin", scriptType: core.BTCInputScriptType.SpendP2SHWitness },
  { addressNList: [2147483692, 2147483650, 2147483648], curve: "secp256k1", showDisplay: true, coin: "Litecoin", scriptType: core.BTCInputScriptType.SpendAddress },
];
const dogeGetPublicKeysInput = [
  { addressNList: [0x80000000 + 44, 0x80000000 + 3, 0x80000000 + 0], curve: "secp256k1", showDisplay: true, coin: "Dogecoin", scriptType: core.BTCInputScriptType.SpendAddress },
];

export async function getXpubs(
  wallet: HDWallet | null,
  setResult: SetResult,
  section: string,
  coin: string
) {
  if (!wallet) {
    setResult(section, "No wallet?");
    return;
  }
  const { hardenedPath } = (wallet as unknown as core.ETHWalletInfo).ethGetAccountPaths({ coin: "Ethereum", accountIdx: 0 })[0];
  const hardenedPathGetPublicKeysInput = [{ addressNList: hardenedPath, curve: "secp256k1", showDisplay: true, coin: "Ethereum" }];
  const getAllPublicKeysInput = [...btcGetPublicKeysInput, ...ltcGetPublicKeysInput, ...bchGetPublicKeysInput, ...dogeGetPublicKeysInput, ...hardenedPathGetPublicKeysInput];
  const getPublicKeysInput =
    coin === "all" ? getAllPublicKeysInput : getAllPublicKeysInput.filter((input: { coin: string }) => input.coin.replace(/\s/g, "") === coin);
  const result = await wallet.getPublicKeys(getPublicKeysInput);
  setResult(section, JSON.stringify(result));
}

export async function doPing(wallet: HDWallet | null, setResult: SetResult, section: string) {
  if (!wallet) {
    setResult(section, "No wallet?");
    return;
  }
  const result = await wallet.ping({ msg: "Hello World", button: true });
  setResult(section, result.msg);
}

export async function doWipe(wallet: HDWallet | null, setResult: SetResult, section: string) {
  if (!wallet) {
    setResult(section, "No wallet?");
    return;
  }
  wallet.wipe();
}

export async function doLoadDevice(wallet: HDWallet | null, setResult: SetResult, section: string) {
  if (!wallet) {
    setResult(section, "No wallet?");
    return;
  }
  wallet.loadDevice({
    mnemonic: "alcohol woman abuse must during monitor noble actual mixed trade anger aisle",
  });
}

export async function doClearSession(wallet: HDWallet | null, setResult: SetResult, section: string) {
  if (!wallet) {
    setResult(section, "No wallet?");
    return;
  }
  await wallet.clearSession();
  setResult(section, "Session Cleared");
}

export async function doDisconnect(wallet: HDWallet | null, setResult: SetResult, section: string) {
  if (!wallet) {
    setResult(section, "No wallet?");
    return;
  }
  await wallet.disconnect();
  setResult(section, "Disconnected");
}

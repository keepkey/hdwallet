import * as core from "@keepkey/hdwallet-core";

import { kujiraTests as tests } from "./kujira";

export function kujiraTests(get: () => { wallet: core.HDWallet; info: core.HDWalletInfo }): void {
  tests(get);
}

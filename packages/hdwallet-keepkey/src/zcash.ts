import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as ZcashMessages from "@keepkey/device-protocol/lib/messages-zcash_pb";
import * as core from "@keepkey/hdwallet-core";
import { Transport } from "./transport";

/**
 * Get the Orchard Full Viewing Key from the device.
 * The FVK (ak, nk, rivk) allows viewing transactions but cannot spend funds.
 */
export async function zcashGetOrchardFVK(
  transport: Transport,
  account: number = 0,
): Promise<{ ak: Uint8Array; nk: Uint8Array; rivk: Uint8Array }> {
  const msg = new ZcashMessages.ZcashGetOrchardFVK();
  msg.setAddressNList([0x80000000 + 32, 0x80000000 + 133, 0x80000000 + account]);
  msg.setAccount(account);
  msg.setShowDisplay(false);

  const response = await transport.call(
    Messages.MessageType.MESSAGETYPE_ZCASHGETORCHARDFVK,
    msg,
    { msgTimeout: core.LONG_TIMEOUT },
  );

  if (response.message_enum !== Messages.MessageType.MESSAGETYPE_ZCASHORCHARDFVK) {
    throw new Error(`zcash: unexpected response ${response.message_type}`);
  }

  const fvk = response.proto as ZcashMessages.ZcashOrchardFVK;
  return {
    ak: fvk.getAk_asU8(),
    nk: fvk.getNk_asU8(),
    rivk: fvk.getRivk_asU8(),
  };
}

/**
 * Sign a PCZT (Partially Constructed Zcash Transaction) on the device.
 *
 * The signing flow is:
 * 1. Send ZcashSignPCZT with transaction metadata + sub-digests
 * 2. Device responds with ZcashPCZTActionAck requesting first action
 * 3. Send ZcashPCZTAction for each action (alpha, sighash, cv_net, etc.)
 * 4. Device responds with ZcashPCZTActionAck for next, or ZcashSignedPCZT when done
 *
 * @param signingRequest - The signing request from the Rust sidecar
 * @returns Array of 64-byte RedPallas signatures, one per action
 */
export async function zcashSignPczt(
  transport: Transport,
  signingRequest: {
    n_actions: number;
    digests: { header: string; transparent: string; sapling: string; orchard: string };
    bundle_meta: { flags: number; value_balance: number; anchor: string };
    actions: Array<{
      index: number;
      alpha: string;
      cv_net: string;
      nullifier: string;
      cmx: string;
      epk: string;
      enc_compact: string;
      enc_memo: string;
      enc_noncompact: string;
      rk: string;
      out_ciphertext: string;
      value: number;
      is_spend: boolean;
    }>;
    display: { amount: string; fee: string; to: string };
  },
  sighash: string,
): Promise<string[]> {
  const account = (signingRequest as any).account ?? 0;

  return transport.lockDuring(async () => {
    // Step 1: Send ZcashSignPCZT with metadata
    const signMsg = new ZcashMessages.ZcashSignPCZT();
    signMsg.setNActions(signingRequest.n_actions);
    signMsg.setBranchId((signingRequest as any).branch_id ?? 0x37519621);

    // ZIP-32 derivation path: purpose=32', coin=133', account'
    signMsg.setAddressNList([0x80000000 + 32, 0x80000000 + 133, 0x80000000 + account]);
    signMsg.setAccount(account);

    // Parse display info for confirmation
    const totalZat = Math.round(
      parseFloat(signingRequest.display.amount.replace(" ZEC", "")) * 1e8,
    );
    const feeZat = Math.round(
      parseFloat(signingRequest.display.fee.replace(" ZEC", "")) * 1e8,
    );
    signMsg.setTotalAmount(totalZat);
    signMsg.setFee(feeZat);

    // Phase 2: Send sub-digests so firmware can compute sighash on-device
    if (signingRequest.digests) {
      signMsg.setHeaderDigest(hexToBytes(signingRequest.digests.header));
      signMsg.setTransparentDigest(hexToBytes(signingRequest.digests.transparent));
      signMsg.setSaplingDigest(hexToBytes(signingRequest.digests.sapling));
      signMsg.setOrchardDigest(hexToBytes(signingRequest.digests.orchard));
    }

    // Phase 2b: Send bundle metadata for on-device orchard digest verification
    if (signingRequest.bundle_meta) {
      signMsg.setOrchardFlags(signingRequest.bundle_meta.flags);
      signMsg.setOrchardValueBalance(signingRequest.bundle_meta.value_balance);
      signMsg.setOrchardAnchor(hexToBytes(signingRequest.bundle_meta.anchor));
    }

    let response = await transport.call(
      Messages.MessageType.MESSAGETYPE_ZCASHSIGNPCZT,
      signMsg,
      { msgTimeout: core.LONG_TIMEOUT, omitLock: true },
    );

    // Step 2: Stream actions to device
    for (let i = 0; i < signingRequest.n_actions; i++) {
      if (response.message_enum !== Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTIONACK) {
        // If device returned ZcashSignedPCZT early, break
        if (response.message_enum === Messages.MessageType.MESSAGETYPE_ZCASHSIGNEDPCZT) {
          break;
        }
        throw new Error(`zcash: unexpected response during signing: ${response.message_type}`);
      }

      const action = signingRequest.actions[i];
      const actionMsg = new ZcashMessages.ZcashPCZTAction();
      actionMsg.setIndex(action.index);
      actionMsg.setAlpha(hexToBytes(action.alpha));
      actionMsg.setSighash(hexToBytes(sighash)); // Legacy fallback if firmware lacks digests
      actionMsg.setCvNet(hexToBytes(action.cv_net));
      actionMsg.setValue(action.value);
      actionMsg.setIsSpend(action.is_spend);

      // Phase 2b: Full action fields for on-device orchard digest verification
      if (action.nullifier) actionMsg.setNullifier(hexToBytes(action.nullifier));
      if (action.cmx) actionMsg.setCmx(hexToBytes(action.cmx));
      if (action.epk) actionMsg.setEpk(hexToBytes(action.epk));
      if (action.enc_compact) actionMsg.setEncCompact(hexToBytes(action.enc_compact));
      if (action.enc_memo) actionMsg.setEncMemo(hexToBytes(action.enc_memo));
      if (action.enc_noncompact) actionMsg.setEncNoncompact(hexToBytes(action.enc_noncompact));
      if (action.rk) actionMsg.setRk(hexToBytes(action.rk));
      if (action.out_ciphertext) actionMsg.setOutCiphertext(hexToBytes(action.out_ciphertext));

      response = await transport.call(
        Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTION,
        actionMsg,
        { msgTimeout: core.LONG_TIMEOUT, omitLock: true },
      );
    }

    // Step 3: Collect signatures
    if (response.message_enum !== Messages.MessageType.MESSAGETYPE_ZCASHSIGNEDPCZT) {
      throw new Error(`zcash: expected ZcashSignedPCZT, got ${response.message_type}`);
    }

    const signedPczt = response.proto as ZcashMessages.ZcashSignedPCZT;
    const signatures: string[] = [];
    for (const sig of signedPczt.getSignaturesList_asU8()) {
      signatures.push(bytesToHex(sig));
    }

    return signatures;
  });
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

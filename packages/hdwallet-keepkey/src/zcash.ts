import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as ZcashMessages from "@keepkey/device-protocol/lib/messages-zcash_pb";
import * as core from "@keepkey/hdwallet-core";

import { Transport } from "./transport";

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

/**
 * Get the Orchard Full Viewing Key from the device.
 * The FVK (ak, nk, rivk) allows viewing transactions but cannot spend funds.
 */
export async function zcashGetOrchardFVK(
  transport: Transport,
  account: number = 0
): Promise<{ ak: Uint8Array; nk: Uint8Array; rivk: Uint8Array }> {
  const msg = new ZcashMessages.ZcashGetOrchardFVK();
  msg.setAddressNList([0x80000000 + 32, 0x80000000 + 133, 0x80000000 + account]);
  msg.setAccount(account);
  msg.setShowDisplay(false);

  const response = await transport.call(Messages.MessageType.MESSAGETYPE_ZCASHGETORCHARDFVK, msg, {
    msgTimeout: core.LONG_TIMEOUT,
  });

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
 * Transparent input descriptor for hybrid shielding transactions.
 */
export interface TransparentInput {
  index: number;
  sighash: string;          // hex, 32 bytes — per-input ZIP-244 §4.10 sighash
  addressNList: number[];   // BIP44 path [44', 133', 0', 0, 0]
  amount: number;           // zatoshis (for display)
}

/**
 * Sign a PCZT (Partially Constructed Zcash Transaction) on the device.
 *
 * Supports two modes:
 * 1. Shielded-only: Orchard spend authorization (RedPallas signatures)
 * 2. Hybrid shielding: Transparent ECDSA + Orchard RedPallas in a single v5 tx
 *
 * The signing flow is:
 * 1. Send ZcashSignPCZT with transaction metadata + sub-digests + n_transparent_inputs
 * 2. Device responds with ZcashPCZTActionAck requesting first input/action
 * 3. [If hybrid] For each transparent input: send ZcashTransparentInput, receive ZcashTransparentSig
 * 4. For each Orchard action: send ZcashPCZTAction, receive ZcashPCZTActionAck or ZcashSignedPCZT
 *
 * @param signingRequest - The signing request from the Rust sidecar
 * @param sighash - The transaction sighash (hex) for Orchard actions
 * @returns Object with orchardSignatures and transparentSignatures arrays
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
    transparent_inputs?: TransparentInput[];
  },
  sighash: string
): Promise<string[]> {
  const account = (signingRequest as any).account ?? 0;
  const transparentInputs = signingRequest.transparent_inputs ?? [];
  const nTransparentInputs = transparentInputs.length;

  return transport.lockDuring(async () => {
    // Step 1: Send ZcashSignPCZT with metadata
    const signMsg = new ZcashMessages.ZcashSignPCZT();
    signMsg.setNActions(signingRequest.n_actions);
    signMsg.setBranchId((signingRequest as any).branch_id ?? 0x37519621);

    // ZIP-32 derivation path: purpose=32', coin=133', account'
    signMsg.setAddressNList([0x80000000 + 32, 0x80000000 + 133, 0x80000000 + account]);
    signMsg.setAccount(account);

    // Parse display info for confirmation
    const totalZat = Math.round(parseFloat(signingRequest.display.amount.replace(" ZEC", "")) * 1e8);
    const feeZat = Math.round(parseFloat(signingRequest.display.fee.replace(" ZEC", "")) * 1e8);
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

    // Phase 3: Set transparent input count for hybrid shielding
    if (nTransparentInputs > 0) {
      signMsg.setNTransparentInputs(nTransparentInputs);
    }

    let response = await transport.call(Messages.MessageType.MESSAGETYPE_ZCASHSIGNPCZT, signMsg, {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });

    // Step 2: Transparent phase (if hybrid shielding)
    const transparentSignatures: string[] = [];
    for (let i = 0; i < nTransparentInputs; i++) {
      if (response.message_enum !== Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTIONACK) {
        throw new Error(`zcash: expected ActionAck for transparent input ${i}, got ${response.message_type}`);
      }

      const input = transparentInputs[i];
      const inputMsg = new ZcashMessages.ZcashTransparentInput();
      inputMsg.setIndex(input.index);
      inputMsg.setSighash(hexToBytes(input.sighash));
      inputMsg.setAddressNList(input.addressNList);
      inputMsg.setAmount(input.amount);

      response = await transport.call(Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTINPUT, inputMsg, {
        msgTimeout: core.LONG_TIMEOUT,
        omitLock: true,
      });

      if (response.message_enum !== Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTSIG) {
        throw new Error(`zcash: expected TransparentSig for input ${i}, got ${response.message_type}`);
      }

      const sigResp = response.proto as ZcashMessages.ZcashTransparentSig;
      transparentSignatures.push(bytesToHex(sigResp.getSignature_asU8()));

      // After last transparent input, device transitions to Orchard phase.
      // If there are Orchard actions, we need to get the next ActionAck.
      if (i === nTransparentInputs - 1 && signingRequest.n_actions > 0) {
        // The device sends a ZcashPCZTActionAck after the last TransparentSig
        // to signal readiness for Orchard actions. But the TransparentSig
        // already has next_index=0xFF meaning "done with transparent".
        // We need to send the first Orchard action now — the device
        // implicitly transitions to the Orchard phase.
      }
    }

    // Step 3: Stream Orchard actions to device
    // After transparent phase, device expects ZcashPCZTAction messages.
    // If we just finished transparent phase, `response` is the last TransparentSig.
    // For the first Orchard action, we send it directly.
    const orchardSignatures: string[] = [];
    for (let i = 0; i < signingRequest.n_actions; i++) {
      // For the first Orchard action after transparent phase, skip the ActionAck check
      if (i > 0 || nTransparentInputs === 0) {
        if (response.message_enum !== Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTIONACK) {
          if (response.message_enum === Messages.MessageType.MESSAGETYPE_ZCASHSIGNEDPCZT) {
            break;
          }
          throw new Error(`zcash: unexpected response during Orchard signing: ${response.message_type}`);
        }
      }

      const action = signingRequest.actions[i];
      const actionMsg = new ZcashMessages.ZcashPCZTAction();
      actionMsg.setIndex(action.index);
      actionMsg.setAlpha(hexToBytes(action.alpha));
      actionMsg.setSighash(hexToBytes(sighash));
      actionMsg.setCvNet(hexToBytes(action.cv_net));
      actionMsg.setValue(action.value);
      actionMsg.setIsSpend(action.is_spend);

      if (action.nullifier) actionMsg.setNullifier(hexToBytes(action.nullifier));
      if (action.cmx) actionMsg.setCmx(hexToBytes(action.cmx));
      if (action.epk) actionMsg.setEpk(hexToBytes(action.epk));
      if (action.enc_compact) actionMsg.setEncCompact(hexToBytes(action.enc_compact));
      if (action.enc_memo) actionMsg.setEncMemo(hexToBytes(action.enc_memo));
      if (action.enc_noncompact) actionMsg.setEncNoncompact(hexToBytes(action.enc_noncompact));
      if (action.rk) actionMsg.setRk(hexToBytes(action.rk));
      if (action.out_ciphertext) actionMsg.setOutCiphertext(hexToBytes(action.out_ciphertext));

      response = await transport.call(Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTION, actionMsg, {
        msgTimeout: core.LONG_TIMEOUT,
        omitLock: true,
      });
    }

    // Step 4: Collect Orchard signatures
    if (response.message_enum !== Messages.MessageType.MESSAGETYPE_ZCASHSIGNEDPCZT) {
      throw new Error(`zcash: expected ZcashSignedPCZT, got ${response.message_type}`);
    }

    const signedPczt = response.proto as ZcashMessages.ZcashSignedPCZT;
    for (const sig of signedPczt.getSignaturesList_asU8()) {
      orchardSignatures.push(bytesToHex(sig));
    }

    // Return combined result — for backward compatibility, if no transparent inputs,
    // return just the orchard signatures as a flat array (existing behavior).
    if (nTransparentInputs === 0) {
      return orchardSignatures;
    }

    // For hybrid shielding, attach transparent signatures to the result.
    // Callers can check (result as any)._transparentSignatures for the DER sigs.
    const result = orchardSignatures as any;
    result._transparentSignatures = transparentSignatures;
    return result;
  });
}

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
 * Display the device-derived Orchard unified address on the device.
 *
 * Host sends only the ZIP-32 account path. Firmware derives the UA from
 * seed material internally, displays it, and returns the confirmed address
 * after user approval.
 */
export async function zcashDisplayAddress(
  transport: Transport,
  params: {
    addressNList?: number[];
    account?: number;
  } = {}
): Promise<{ address: string }> {
  const account = params.account ?? 0;
  const msg = new ZcashMessages.ZcashDisplayAddress();
  msg.setAddressNList(params.addressNList ?? [0x80000000 + 32, 0x80000000 + 133, 0x80000000 + account]);
  msg.setAccount(account);

  const response = await transport.call(Messages.MessageType.MESSAGETYPE_ZCASHDISPLAYADDRESS, msg, {
    msgTimeout: core.LONG_TIMEOUT,
  });

  if (response.message_enum !== Messages.MessageType.MESSAGETYPE_ZCASHADDRESS) {
    throw new Error(`zcash: unexpected response ${response.message_type}`);
  }

  const addressResp = response.proto as ZcashMessages.ZcashAddress;
  const confirmedAddress = addressResp.getAddress();
  if (!confirmedAddress) {
    throw new Error("zcash: device returned an empty address");
  }
  return { address: confirmedAddress };
}

export interface TransparentInput {
  index: number;
  addressNList: number[];
  amount: number; // zatoshis
  prevoutTxid?: string; // hex, 32 bytes LE
  prevoutIndex?: number;
  sequence?: number;
  scriptPubkey?: string; // hex
  sighash?: string; // legacy, unused by new firmware
}

export interface TransparentOutput {
  index: number;
  value: number; // zatoshis
  script_pubkey: string; // hex
}

/**
 * Sign a PCZT on the device.
 *
 * Protocol (firmware 7.15+):
 * 1. ZcashSignPCZT → ZcashTransparentAck(nextOutputIndex=0) if outputs, else
 *                  → ZcashTransparentAck(nextInputIndex=0) if inputs, else
 *                  → ZcashPCZTActionAck(0) for shielded-only
 * 2. [outputs] ZcashTransparentOutput × N → ZcashTransparentAck per output;
 *    last output → ZcashTransparentAck(nextInputIndex=0) or ZcashPCZTActionAck
 * 3. [inputs]  ZcashTransparentInput  × N → ZcashTransparentAck per input;
 *    last input → ZcashTransparentSigned (batch sigs)
 * 4. ZcashPCZTAction × n_actions → ZcashSignedPCZT
 */
export async function zcashSignPczt(
  transport: Transport,
  signingRequest: {
    n_actions: number;
    account?: number;
    branch_id?: number;
    digests?: { header?: string; transparent?: string; sapling?: string; orchard?: string };
    bundle_meta?: { flags: number; value_balance: number; anchor: string };
    header_fields?: { tx_version: number; version_group_id: number; lock_time: number; expiry_height: number };
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
      recipient?: string;
      rseed?: string;
    }>;
    display: { amount: string; fee: string; to?: string; action?: string };
    transparent_inputs?: TransparentInput[];
    transparent_outputs?: TransparentOutput[];
  },
  sighash: string
): Promise<string[]> {
  const account = signingRequest.account ?? 0;
  const transparentInputs = signingRequest.transparent_inputs ?? [];
  const nTransparentInputs = transparentInputs.length;
  const transparentOutputs = signingRequest.transparent_outputs ?? [];
  const nTransparentOutputs = transparentOutputs.length;

  return transport.lockDuring(async () => {
    // Step 1: Send ZcashSignPCZT with metadata
    const signMsg = new ZcashMessages.ZcashSignPCZT();
    signMsg.setNActions(signingRequest.n_actions);
    signMsg.setBranchId(signingRequest.branch_id ?? 0x37519621);
    signMsg.setAddressNList([0x80000000 + 32, 0x80000000 + 133, 0x80000000 + account]);
    signMsg.setAccount(account);

    const totalZat = Math.round(parseFloat(signingRequest.display.amount.replace(" ZEC", "")) * 1e8);
    const feeZat = Math.round(parseFloat(signingRequest.display.fee.replace(" ZEC", "")) * 1e8);
    signMsg.setTotalAmount(totalZat);
    signMsg.setFee(feeZat);

    // Transaction header fields (firmware reconstructs header_digest from these)
    const hf = signingRequest.header_fields;
    if (hf) {
      signMsg.setTxVersion(hf.tx_version);
      signMsg.setVersionGroupId(hf.version_group_id);
      signMsg.setLockTime(hf.lock_time);
      signMsg.setExpiryHeight(hf.expiry_height);
    }

    // ZIP-244 sub-digests
    const d = signingRequest.digests;
    if (d) {
      if (d.header) signMsg.setHeaderDigest(hexToBytes(d.header));
      if (d.transparent) signMsg.setTransparentDigest(hexToBytes(d.transparent));
      if (d.sapling) signMsg.setSaplingDigest(hexToBytes(d.sapling));
      if (d.orchard) signMsg.setOrchardDigest(hexToBytes(d.orchard));
    }

    // Orchard bundle metadata
    const bm = signingRequest.bundle_meta;
    if (bm) {
      signMsg.setOrchardFlags(bm.flags);
      signMsg.setOrchardValueBalance(bm.value_balance);
      signMsg.setOrchardAnchor(hexToBytes(bm.anchor));
    }

    if (nTransparentOutputs > 0) signMsg.setNTransparentOutputs(nTransparentOutputs);
    if (nTransparentInputs > 0) signMsg.setNTransparentInputs(nTransparentInputs);

    console.log("[zcash-pczt] → ZcashSignPCZT", {
      n_actions: signingRequest.n_actions,
      branch_id: (signingRequest.branch_id ?? 0x37519621).toString(16),
      account,
      tx_version: hf?.tx_version,
      version_group_id: hf?.version_group_id?.toString(16),
      lock_time: hf?.lock_time,
      expiry_height: hf?.expiry_height,
      header_digest: d?.header ? d.header.slice(0, 8) + "..." : undefined,
      transparent_digest: d?.transparent ? d.transparent.slice(0, 8) + "..." : undefined,
      sapling_digest: d?.sapling ?? "(absent)",
      orchard_digest: d?.orchard ? d.orchard.slice(0, 8) + "..." : undefined,
      orchard_flags: bm?.flags,
      orchard_value_balance: bm?.value_balance,
      n_transparent_outputs: nTransparentOutputs,
      n_transparent_inputs: nTransparentInputs,
      total_zat: totalZat,
      fee_zat: feeZat,
    });

    let response = await transport.call(Messages.MessageType.MESSAGETYPE_ZCASHSIGNPCZT, signMsg, {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });

    console.log("[zcash-pczt] ← response:", response.message_type, response.message_enum);

    // Step 2: Transparent phase (outputs first, then inputs)
    const transparentSignatures: string[] = [];
    const hasTransparentPhase = nTransparentOutputs > 0 || nTransparentInputs > 0;

    if (hasTransparentPhase) {
      if (response.message_enum !== Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTACK) {
        throw new Error(`zcash: expected TransparentAck to start transparent phase, got ${response.message_type}`);
      }

      // Step 2a: Output phase — firmware requests outputs before inputs
      if (nTransparentOutputs > 0) {
        let ack = response.proto as ZcashMessages.ZcashTransparentAck;
        console.log("[zcash-pczt]   TransparentAck hasNextOutputIndex:", ack.hasNextOutputIndex(),
          "nextOutputIndex:", ack.getNextOutputIndex(),
          "hasNextInputIndex:", ack.hasNextInputIndex(),
          "nextInputIndex:", ack.getNextInputIndex());

        if (!ack.hasNextOutputIndex()) {
          throw new Error(`zcash: expected nextOutputIndex in TransparentAck, got nextInputIndex=${ack.getNextInputIndex()}`);
        }
        let outputIndex = ack.getNextOutputIndex() ?? 0;

        for (let i = 0; i < nTransparentOutputs; i++) {
          const output = transparentOutputs[outputIndex];
          console.log(`[zcash-pczt] → ZcashTransparentOutput [${i}]`, {
            raw_output: output,
            index: output?.index,
            value: output?.value,
            script_pubkey: output?.script_pubkey,
            script_pubkey_bytes: output?.script_pubkey ? hexToBytes(output.script_pubkey).length : undefined,
          });

          const outputMsg = new ZcashMessages.ZcashTransparentOutput();
          outputMsg.setIndex(output.index);
          outputMsg.setAmount(output.value);
          outputMsg.setScriptPubkey(hexToBytes(output.script_pubkey));

          response = await transport.call(Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTOUTPUT, outputMsg, {
            msgTimeout: core.LONG_TIMEOUT,
            omitLock: true,
          });

          console.log(`[zcash-pczt] ← output[${i}] response:`, response.message_type, response.message_enum);

          // After the last output with no transparent inputs, firmware skips straight
          // to Orchard and sends ZcashPCZTActionAck(0) instead of TransparentAck.
          if (response.message_enum === Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTIONACK) {
            break;
          }

          if (response.message_enum !== Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTACK) {
            throw new Error(`zcash: expected TransparentAck after output ${outputIndex}, got ${response.message_type}`);
          }

          ack = response.proto as ZcashMessages.ZcashTransparentAck;
          console.log("[zcash-pczt]   TransparentAck after output:", {
            hasNextOutputIndex: ack.hasNextOutputIndex(),
            nextOutputIndex: ack.getNextOutputIndex(),
            hasNextInputIndex: ack.hasNextInputIndex(),
            nextInputIndex: ack.getNextInputIndex(),
          });

          if (ack.hasNextOutputIndex()) {
            outputIndex = ack.getNextOutputIndex() ?? i + 1;
          }
          // else: ack has nextInputIndex — output phase done
        }
      }

      // Step 2b: Input phase
      if (nTransparentInputs > 0) {
        if (response.message_enum !== Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTACK) {
          throw new Error(`zcash: expected TransparentAck before transparent inputs, got ${response.message_type}`);
        }
        let inputIndex = (response.proto as ZcashMessages.ZcashTransparentAck).getNextInputIndex() ?? 0;

        for (let i = 0; i < nTransparentInputs; i++) {
          const input = transparentInputs[inputIndex];
          console.log(`[zcash-pczt] → ZcashTransparentInput [${i}]`, {
            raw_input: input,
            index: input?.index,
            amount: input?.amount,
            prevoutTxid: input?.prevoutTxid,
            prevoutIndex: input?.prevoutIndex,
            sequence: input?.sequence,
            scriptPubkey: input?.scriptPubkey,
            addressNList: input?.addressNList,
          });

          const inputMsg = new ZcashMessages.ZcashTransparentInput();
          inputMsg.setIndex(input.index);
          inputMsg.setAddressNList(input.addressNList);
          inputMsg.setAmount(input.amount);
          if (input.prevoutTxid) inputMsg.setPrevoutTxid(hexToBytes(input.prevoutTxid));
          if (input.prevoutIndex !== undefined) inputMsg.setPrevoutIndex(input.prevoutIndex);
          if (input.sequence !== undefined) inputMsg.setSequence(input.sequence);
          if (input.scriptPubkey) inputMsg.setScriptPubkey(hexToBytes(input.scriptPubkey));

          response = await transport.call(Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTINPUT, inputMsg, {
            msgTimeout: core.LONG_TIMEOUT,
            omitLock: true,
          });

          console.log(`[zcash-pczt] ← input[${i}] response:`, response.message_type, response.message_enum);

          // Firmware 7.15+: after last input, sends ZcashPCZTActionAck(0) and buffers
          // transparent ECDSA sigs internally — they come out with ZcashTransparentSigned
          // BEFORE ZcashSignedPCZT after the last Orchard action.
          if (response.message_enum === Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTIONACK) {
            break;
          }

          // Older firmware path: ZcashTransparentSigned returned immediately after last input.
          if (response.message_enum === Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTSIGNED) {
            const sigResp = response.proto as ZcashMessages.ZcashTransparentSigned;
            for (const sig of sigResp.getSignaturesList_asU8()) {
              transparentSignatures.push(bytesToHex(sig));
            }
            console.log(`[zcash-pczt]   ZcashTransparentSigned (legacy): ${transparentSignatures.length} sig(s)`);
            break;
          }

          if (response.message_enum !== Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTACK) {
            throw new Error(`zcash: expected TransparentAck after input ${inputIndex}, got ${response.message_type}`);
          }

          inputIndex = (response.proto as ZcashMessages.ZcashTransparentAck).getNextInputIndex() ?? i + 1;
        }
      }
    }

    // Step 3: Stream Orchard actions to device.
    // Firmware always sends ZcashPCZTActionAck before each action (including the first —
    // the ack after the last transparent input doubles as action[0] ack).
    const orchardSignatures: string[] = [];
    for (let i = 0; i < signingRequest.n_actions; i++) {
      if (response.message_enum !== Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTIONACK) {
        if (response.message_enum === Messages.MessageType.MESSAGETYPE_ZCASHSIGNEDPCZT) {
          break;
        }
        throw new Error(`zcash: unexpected response during Orchard signing: ${response.message_type}`);
      }

      const action = signingRequest.actions[i];
      console.log(`[zcash-pczt] → ZcashPCZTAction [${i}]`, {
        index: action?.index,
        value: action?.value,
        is_spend: action?.is_spend,
        alpha_bytes: action?.alpha ? hexToBytes(action.alpha).length : undefined,
        nullifier_defined: !!action?.nullifier,
        cmx_defined: !!action?.cmx,
        epk_defined: !!action?.epk,
        enc_compact_bytes: action?.enc_compact ? hexToBytes(action.enc_compact).length : undefined,
        enc_memo_bytes: action?.enc_memo ? hexToBytes(action.enc_memo).length : undefined,
        enc_noncompact_bytes: action?.enc_noncompact ? hexToBytes(action.enc_noncompact).length : undefined,
        rk_defined: !!action?.rk,
        out_ciphertext_bytes: action?.out_ciphertext ? hexToBytes(action.out_ciphertext).length : undefined,
        recipient_bytes: action?.recipient ? hexToBytes(action.recipient).length : undefined,
        rseed_bytes: action?.rseed ? hexToBytes(action.rseed).length : undefined,
      });

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
      // Clear-signing: firmware 7.15+ requires recipient + rseed for output actions
      if (action.recipient) actionMsg.setRecipient(hexToBytes(action.recipient));
      if (action.rseed) actionMsg.setRseed(hexToBytes(action.rseed));

      response = await transport.call(Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTION, actionMsg, {
        msgTimeout: core.LONG_TIMEOUT,
        omitLock: true,
      });

      console.log(`[zcash-pczt] ← action[${i}] response:`, response.message_type, response.message_enum);
    }

    // Step 4: Firmware 7.15+ sends ZcashTransparentSigned immediately before ZcashSignedPCZT
    // when there are transparent inputs — collect those sigs, then read the following message.
    if (response.message_enum === Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTSIGNED) {
      const sigResp = response.proto as ZcashMessages.ZcashTransparentSigned;
      for (const sig of sigResp.getSignaturesList_asU8()) {
        transparentSignatures.push(bytesToHex(sig));
      }
      console.log(`[zcash-pczt]   ZcashTransparentSigned: ${transparentSignatures.length} sig(s), reading ZcashSignedPCZT...`);
      response = await (transport as any).readResponse(false);
      console.log(`[zcash-pczt] ← readResponse:`, response.message_type, response.message_enum);
    }

    // Step 5: Collect Orchard signatures
    if (response.message_enum !== Messages.MessageType.MESSAGETYPE_ZCASHSIGNEDPCZT) {
      throw new Error(`zcash: expected ZcashSignedPCZT, got ${response.message_type}`);
    }

    const signedPczt = response.proto as ZcashMessages.ZcashSignedPCZT;
    for (const sig of signedPczt.getSignaturesList_asU8()) {
      orchardSignatures.push(bytesToHex(sig));
    }

    console.log(`[zcash-pczt] DONE: ${orchardSignatures.length} Orchard sig(s), ${transparentSignatures.length} transparent sig(s)`);

    if (!hasTransparentPhase) {
      return orchardSignatures;
    }

    // For hybrid shielding, attach transparent signatures to the result.
    // Callers can check (result as any)._transparentSignatures for the DER sigs.
    const result = orchardSignatures as any;
    result._transparentSignatures = transparentSignatures;
    return result;
  });
}

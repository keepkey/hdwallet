/**
 * Integration tests for zcashSignPczt.
 *
 * These tests use a mock transport that validates the exact protobuf message
 * fields sent at each step. Every field the firmware requires must appear here.
 * When a new firmware protocol step is added, add a test case.
 *
 * Fixture data mirrors the real sidecar JSON structure so the tests catch
 * key-name mismatches (e.g. prevout_txid vs prevoutTxid) before hitting the device.
 */

import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as ZcashMessages from "@keepkey/device-protocol/lib/messages-zcash_pb";

import { zcashSignPczt } from "./zcash";

// Realistic signing request that mirrors what the Rust sidecar returns for a
// shield transaction: 1 transparent input, 1 transparent output, 2 Orchard actions.
const SHIELD_REQUEST = {
  n_actions: 2,
  account: 0,
  branch_id: 0x4dec4df0,
  header_fields: {
    tx_version: 5,
    version_group_id: 0x26a7270a,
    lock_time: 0,
    expiry_height: 0,
  },
  digests: {
    header:      "59bc2475723880114749687687be420e7e3389ce82e0ad6b9ba62e0a28457d3d",
    transparent: "f6424c87af931906154bc15c40fa50b9323fc99271e5c1a98c2d9cc214eb9f94",
    // sapling intentionally absent — firmware rejects it if set
    orchard:     "a8554ee3a53af330a6b6cf56112a203d3d028f2e421cb494a3f590161d27414a",
  },
  bundle_meta: {
    flags: 3,
    value_balance: -3983918,
    anchor: "419a28788f9fbfe0a01807e50c00e938f7b9b8381584021efeecb3d18a3c0b28",
  },
  display: { amount: "0.03983918 ZEC", fee: "0.00015000 ZEC" },
  transparent_outputs: [
    { index: 0, value: 10000, script_pubkey: "76a9149ef6ee0267fd387526020c265a470e2dad7f3b5e88ac" },
  ],
  transparent_inputs: [
    {
      index: 0,
      addressNList: [0x80000000 + 44, 0x80000000 + 133, 0x80000000, 0, 0],
      amount: 4008918,
      prevoutTxid:  "ca3a5ef0323760c97406564a0eb51239ca1afa4944e968af78084d70982c13df",
      prevoutIndex: 1,
      sequence:     0xffffffff,
      scriptPubkey: "76a9149ef6ee0267fd387526020c265a470e2dad7f3b5e88ac",
    },
  ],
  actions: [
    {
      index: 0, alpha: "aa".repeat(32), cv_net: "bb".repeat(32),
      nullifier: "cc".repeat(32), cmx: "dd".repeat(32), epk: "ee".repeat(32),
      enc_compact: "ff".repeat(52), enc_memo: "11".repeat(512), enc_noncompact: "22".repeat(16),
      rk: "33".repeat(32), out_ciphertext: "44".repeat(80), value: 3983918, is_spend: false,
      // recipient/rseed required for output actions (firmware clear-signing check)
      recipient: "ab".repeat(43),
      rseed: "cd".repeat(32),
    },
    {
      index: 1, alpha: "55".repeat(32), cv_net: "66".repeat(32),
      nullifier: "77".repeat(32), cmx: "88".repeat(32), epk: "99".repeat(32),
      enc_compact: "aa".repeat(52), enc_memo: "bb".repeat(512), enc_noncompact: "cc".repeat(16),
      rk: "dd".repeat(32), out_ciphertext: "ee".repeat(80), value: 0, is_spend: true,
    },
  ],
};

const SIGHASH = "5b1e4f350c80aef3b21385a0f9a35ab89b2379d1a74ed69170ec44aa507264f9";

function makeMockTransport(callImpl: jest.Mock, readResponseImpl?: jest.Mock) {
  return {
    debugLink: false,
    call: callImpl,
    lockDuring: <T>(fn: () => Promise<T>) => fn(),
    readResponse: readResponseImpl ?? jest.fn().mockResolvedValue({
      message_enum: -1, message_type: "Unknown", proto: {},
    }),
  } as any;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  return bytes;
}

describe("zcashSignPczt — shield tx (1 output, 1 input, 2 actions)", () => {
  it("sends ZcashSignPCZT with all required header and digest fields", async () => {
    const capturedMsg: ZcashMessages.ZcashSignPCZT[] = [];
    const call = jest.fn().mockImplementation((mtype: number, msg: any) => {
      if (mtype === Messages.MessageType.MESSAGETYPE_ZCASHSIGNPCZT) {
        capturedMsg.push(msg);
        // Abort early — we only care about validating ZcashSignPCZT
        return Promise.reject(new Error("TEST_ABORT"));
      }
      return Promise.reject(new Error("unexpected call"));
    });

    await zcashSignPczt(makeMockTransport(call), SHIELD_REQUEST, SIGHASH).catch((e) => {
      if (!String(e?.message).includes("TEST_ABORT")) throw e;
    });

    expect(capturedMsg).toHaveLength(1);
    const msg = capturedMsg[0];

    // Transaction header fields (firmware recomputes header_digest from these)
    expect(msg.getTxVersion()).toBe(5);
    expect(msg.getVersionGroupId()).toBe(0x26a7270a);
    expect(msg.getLockTime()).toBe(0);
    expect(msg.getExpiryHeight()).toBe(0);
    expect(msg.getBranchId()).toBe(0x4dec4df0);

    // Sub-digests
    expect(Buffer.from(msg.getHeaderDigest_asU8()).toString("hex"))
      .toBe("59bc2475723880114749687687be420e7e3389ce82e0ad6b9ba62e0a28457d3d");
    expect(Buffer.from(msg.getTransparentDigest_asU8()).toString("hex"))
      .toBe("f6424c87af931906154bc15c40fa50b9323fc99271e5c1a98c2d9cc214eb9f94");
    expect(msg.hasSaplingDigest()).toBe(false); // sapling must NOT be set
    expect(Buffer.from(msg.getOrchardDigest_asU8()).toString("hex"))
      .toBe("a8554ee3a53af330a6b6cf56112a203d3d028f2e421cb494a3f590161d27414a");

    // Transparent counts
    expect(msg.getNTransparentOutputs()).toBe(1);
    expect(msg.getNTransparentInputs()).toBe(1);

    // Orchard
    expect(msg.getNActions()).toBe(2);
    expect(msg.getOrchardFlags()).toBe(3);
  });

  it("follows full output→input→Orchard protocol sequence", async () => {
    const calls: number[] = [];
    const capturedOutputMsg: ZcashMessages.ZcashTransparentOutput[] = [];
    const capturedInputMsg: ZcashMessages.ZcashTransparentInput[] = [];
    const capturedActionMsg: ZcashMessages.ZcashPCZTAction[] = [];

    // Firmware 7.15+ sends ZcashTransparentSigned + ZcashSignedPCZT back-to-back after
    // the last Orchard action. readResponse is called without sending to drain the second.
    const transparentSigned = new ZcashMessages.ZcashTransparentSigned();
    transparentSigned.addSignatures(new Uint8Array(71).fill(0x30));

    const signedPczt = new ZcashMessages.ZcashSignedPCZT();
    signedPczt.addSignatures(new Uint8Array(64).fill(0x42));
    signedPczt.addSignatures(new Uint8Array(64).fill(0x43));

    const readResponse = jest.fn().mockResolvedValue({
      message_enum: Messages.MessageType.MESSAGETYPE_ZCASHSIGNEDPCZT,
      message_type: "ZcashSignedPCZT",
      proto: signedPczt,
    });

    const call = jest.fn().mockImplementation((mtype: number, msg: any) => {
      calls.push(mtype);

      // Step 1: ZcashSignPCZT → TransparentAck(nextOutputIndex=0)
      if (mtype === Messages.MessageType.MESSAGETYPE_ZCASHSIGNPCZT) {
        const ack = new ZcashMessages.ZcashTransparentAck();
        ack.setNextOutputIndex(0);
        return Promise.resolve({
          message_enum: Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTACK,
          message_type: "ZcashTransparentAck",
          proto: ack,
        });
      }

      // Step 2: ZcashTransparentOutput → TransparentAck(nextInputIndex=0)
      if (mtype === Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTOUTPUT) {
        capturedOutputMsg.push(msg);
        const ack = new ZcashMessages.ZcashTransparentAck();
        ack.setNextInputIndex(0);
        return Promise.resolve({
          message_enum: Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTACK,
          message_type: "ZcashTransparentAck",
          proto: ack,
        });
      }

      // Step 3: ZcashTransparentInput → ZcashPCZTActionAck(0)
      // Firmware buffers transparent sigs; they come with ZcashTransparentSigned after last action.
      if (mtype === Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTINPUT) {
        capturedInputMsg.push(msg);
        const ack = new ZcashMessages.ZcashPCZTActionAck();
        ack.setNextIndex(0);
        return Promise.resolve({
          message_enum: Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTIONACK,
          message_type: "ZcashPCZTActionAck",
          proto: ack,
        });
      }

      // Step 4a: ZcashPCZTAction (action 0) → ZcashPCZTActionAck(nextIndex=1)
      if (mtype === Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTION && calls.filter(c => c === mtype).length === 1) {
        capturedActionMsg.push(msg);
        const ack = new ZcashMessages.ZcashPCZTActionAck();
        ack.setNextIndex(1);
        return Promise.resolve({
          message_enum: Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTIONACK,
          message_type: "ZcashPCZTActionAck",
          proto: ack,
        });
      }

      // Step 4b: ZcashPCZTAction (action 1, last) → ZcashTransparentSigned
      // ZcashSignedPCZT follows immediately; readResponse() drains it from USB buffer.
      if (mtype === Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTION) {
        capturedActionMsg.push(msg);
        return Promise.resolve({
          message_enum: Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTSIGNED,
          message_type: "ZcashTransparentSigned",
          proto: transparentSigned,
        });
      }

      throw new Error(`unexpected call: ${mtype}`);
    });

    const result = await zcashSignPczt(makeMockTransport(call, readResponse), SHIELD_REQUEST, SIGHASH) as any;

    // Protocol sequence: SignPCZT → Output → Input → Action × 2 (via call)
    // + readResponse() called once to drain ZcashSignedPCZT after ZcashTransparentSigned
    expect(calls).toEqual([
      Messages.MessageType.MESSAGETYPE_ZCASHSIGNPCZT,
      Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTOUTPUT,
      Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTINPUT,
      Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTION,
      Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTION,
    ]);
    expect(readResponse).toHaveBeenCalledTimes(1);

    // ZcashTransparentOutput fields
    expect(capturedOutputMsg).toHaveLength(1);
    expect(capturedOutputMsg[0].getIndex()).toBe(0);
    expect(capturedOutputMsg[0].getAmount()).toBe(10000);
    expect(Buffer.from(capturedOutputMsg[0].getScriptPubkey_asU8()).toString("hex"))
      .toBe("76a9149ef6ee0267fd387526020c265a470e2dad7f3b5e88ac");

    // ZcashTransparentInput fields
    expect(capturedInputMsg).toHaveLength(1);
    expect(capturedInputMsg[0].getIndex()).toBe(0);
    expect(capturedInputMsg[0].getAmount()).toBe(4008918);
    expect(Buffer.from(capturedInputMsg[0].getPrevoutTxid_asU8()).toString("hex"))
      .toBe("ca3a5ef0323760c97406564a0eb51239ca1afa4944e968af78084d70982c13df");
    expect(capturedInputMsg[0].getPrevoutIndex()).toBe(1);
    expect(capturedInputMsg[0].getSequence()).toBe(0xffffffff);
    expect(Buffer.from(capturedInputMsg[0].getScriptPubkey_asU8()).toString("hex"))
      .toBe("76a9149ef6ee0267fd387526020c265a470e2dad7f3b5e88ac");

    // ZcashPCZTAction fields — output action must carry value/recipient/rseed for clear-signing
    expect(capturedActionMsg).toHaveLength(2);
    // action[0] is the output (is_spend=false)
    expect(capturedActionMsg[0].getIsSpend()).toBe(false);
    // value must be the OUTPUT note value, not 0 — firmware recomputes cmx from value+recipient+rseed+nullifier
    expect(capturedActionMsg[0].getValue()).toBe(3983918);
    expect(capturedActionMsg[0].getRecipient_asU8()).toHaveLength(43);
    expect(Buffer.from(capturedActionMsg[0].getRecipient_asU8()).toString("hex"))
      .toBe("ab".repeat(43));
    expect(capturedActionMsg[0].getRseed_asU8()).toHaveLength(32);
    expect(Buffer.from(capturedActionMsg[0].getRseed_asU8()).toString("hex"))
      .toBe("cd".repeat(32));
    // action[1] is the dummy spend (is_spend=true) — value 0, no recipient/rseed
    expect(capturedActionMsg[1].getIsSpend()).toBe(true);
    expect(capturedActionMsg[1].getValue()).toBe(0);
    expect(capturedActionMsg[1].getRecipient_asU8()).toHaveLength(0);

    // Orchard sigs returned, transparent sigs attached (from ZcashTransparentSigned)
    expect(result).toHaveLength(2);
    expect(result._transparentSignatures).toHaveLength(1);
  });

  it("shielded-only (no transparent) goes directly to ZcashPCZTActionAck", async () => {
    const calls: number[] = [];
    const call = jest.fn().mockImplementation((mtype: number) => {
      calls.push(mtype);
      const actionCount = calls.filter(c => c === Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTION).length;

      if (mtype === Messages.MessageType.MESSAGETYPE_ZCASHSIGNPCZT) {
        const ack = new ZcashMessages.ZcashPCZTActionAck();
        ack.setNextIndex(0);
        return Promise.resolve({
          message_enum: Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTIONACK,
          message_type: "ZcashPCZTActionAck",
          proto: ack,
        });
      }

      if (mtype === Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTION && actionCount < 2) {
        // First action → ack requesting next
        const ack = new ZcashMessages.ZcashPCZTActionAck();
        ack.setNextIndex(1);
        return Promise.resolve({
          message_enum: Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTIONACK,
          message_type: "ZcashPCZTActionAck",
          proto: ack,
        });
      }

      if (mtype === Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTION) {
        // Last action → final signed PCZT
        const signed = new ZcashMessages.ZcashSignedPCZT();
        signed.addSignatures(new Uint8Array(64).fill(0x42));
        return Promise.resolve({
          message_enum: Messages.MessageType.MESSAGETYPE_ZCASHSIGNEDPCZT,
          message_type: "ZcashSignedPCZT",
          proto: signed,
        });
      }

      throw new Error(`unexpected call: ${mtype}`);
    });

    const orchardOnlyRequest = {
      ...SHIELD_REQUEST,
      transparent_inputs: [],
      transparent_outputs: [],
    };

    const result = await zcashSignPczt(makeMockTransport(call), orchardOnlyRequest, SIGHASH);

    expect(calls).toEqual([
      Messages.MessageType.MESSAGETYPE_ZCASHSIGNPCZT,
      Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTION,
      Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTION,
    ]);
    expect(result).toHaveLength(1);
    expect((result as any)._transparentSignatures).toBeUndefined();
  });
});

// Deshield (Z→T): 1 transparent output, 0 transparent inputs, 2 Orchard actions.
// After the last transparent output firmware sends ZcashPCZTActionAck (not TransparentAck)
// because there are no inputs — it finalises the transparent digest and opens Orchard directly.
const DESHIELD_REQUEST = {
  n_actions: 2,
  account: 0,
  branch_id: 0x4dec4df0,
  header_fields: { tx_version: 5, version_group_id: 0x26a7270a, lock_time: 0, expiry_height: 0 },
  digests: {
    header:      "59bc2475723880114749687687be420e7e3389ce82e0ad6b9ba62e0a28457d3d",
    transparent: "0a259ca3000000000000000000000000000000000000000000000000000000ff",
    orchard:     "d0f62785000000000000000000000000000000000000000000000000000000ff",
  },
  bundle_meta: { flags: 3, value_balance: 2515000, anchor: "419a28788f9fbfe0a01807e50c00e938f7b9b8381584021efeecb3d18a3c0b28" },
  display: { amount: "0.02500000 ZEC", fee: "0.00015000 ZEC" },
  transparent_outputs: [
    { index: 0, value: 2500000, script_pubkey: "76a9149ef6ee0267fd387526020c265a470e2dad7f3b5e88ac" },
  ],
  transparent_inputs: [],
  actions: [
    {
      // Change output back to Orchard — is_spend=false, value is the OUTPUT note value (change amount)
      index: 0, alpha: "aa".repeat(32), cv_net: "bb".repeat(32),
      nullifier: "cc".repeat(32), cmx: "dd".repeat(32), epk: "ee".repeat(32),
      enc_compact: "ff".repeat(52), enc_memo: "11".repeat(512), enc_noncompact: "22".repeat(16),
      rk: "33".repeat(32), out_ciphertext: "44".repeat(80),
      value: 1358918, is_spend: false,
      recipient: "ab".repeat(43), rseed: "cd".repeat(32),
    },
    {
      // Real spend + dummy output — is_spend=true, dummy output value is 0
      // recipient/rseed still required: firmware verifies cmx for the dummy output too
      index: 1, alpha: "55".repeat(32), cv_net: "66".repeat(32),
      nullifier: "77".repeat(32), cmx: "88".repeat(32), epk: "99".repeat(32),
      enc_compact: "aa".repeat(52), enc_memo: "bb".repeat(512), enc_noncompact: "cc".repeat(16),
      rk: "dd".repeat(32), out_ciphertext: "ee".repeat(80),
      value: 0, is_spend: true,
      recipient: "ef".repeat(43), rseed: "12".repeat(32),
    },
  ],
};

describe("zcashSignPczt — deshield tx (1 output, 0 inputs, 2 actions)", () => {
  it("follows output→ZcashPCZTActionAck→Orchard protocol (no TransparentAck after last output)", async () => {
    const calls: number[] = [];
    const capturedOutputMsg: ZcashMessages.ZcashTransparentOutput[] = [];
    const capturedActionMsg: ZcashMessages.ZcashPCZTAction[] = [];

    const signedPczt = new ZcashMessages.ZcashSignedPCZT();
    signedPczt.addSignatures(new Uint8Array(64).fill(0x42));
    signedPczt.addSignatures(new Uint8Array(64).fill(0x43));

    const call = jest.fn().mockImplementation((mtype: number, msg: any) => {
      calls.push(mtype);
      const actionsSent = calls.filter(c => c === Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTION).length;

      // Step 1: ZcashSignPCZT → TransparentAck(nextOutputIndex=0)
      if (mtype === Messages.MessageType.MESSAGETYPE_ZCASHSIGNPCZT) {
        const ack = new ZcashMessages.ZcashTransparentAck();
        ack.setNextOutputIndex(0);
        return Promise.resolve({
          message_enum: Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTACK,
          message_type: "ZcashTransparentAck", proto: ack,
        });
      }

      // Step 2: ZcashTransparentOutput → ZcashPCZTActionAck(0)
      // No inputs → firmware finalises transparent digest and opens Orchard directly.
      // Regression: previously threw "expected TransparentAck after output 0, got ZCASHPCZTACTIONACK"
      if (mtype === Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTOUTPUT) {
        capturedOutputMsg.push(msg);
        const ack = new ZcashMessages.ZcashPCZTActionAck();
        ack.setNextIndex(0);
        return Promise.resolve({
          message_enum: Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTIONACK,
          message_type: "ZcashPCZTActionAck", proto: ack,
        });
      }

      // Step 3a: ZcashPCZTAction[0] → ZcashPCZTActionAck(1)
      if (mtype === Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTION && actionsSent === 1) {
        capturedActionMsg.push(msg);
        const ack = new ZcashMessages.ZcashPCZTActionAck();
        ack.setNextIndex(1);
        return Promise.resolve({
          message_enum: Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTIONACK,
          message_type: "ZcashPCZTActionAck", proto: ack,
        });
      }

      // Step 3b: ZcashPCZTAction[1] (last) → ZcashSignedPCZT
      if (mtype === Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTION) {
        capturedActionMsg.push(msg);
        return Promise.resolve({
          message_enum: Messages.MessageType.MESSAGETYPE_ZCASHSIGNEDPCZT,
          message_type: "ZcashSignedPCZT", proto: signedPczt,
        });
      }

      throw new Error(`unexpected call: ${mtype}`);
    });

    const result = await zcashSignPczt(makeMockTransport(call), DESHIELD_REQUEST, SIGHASH) as any;

    // Protocol must be: SignPCZT → Output → Action × 2 (no Input step)
    expect(calls).toEqual([
      Messages.MessageType.MESSAGETYPE_ZCASHSIGNPCZT,
      Messages.MessageType.MESSAGETYPE_ZCASHTRANSPARENTOUTPUT,
      Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTION,
      Messages.MessageType.MESSAGETYPE_ZCASHPCZTACTION,
    ]);

    // ZcashSignPCZT must declare 1 output, 0 inputs
    const signPcztCall = call.mock.calls.find(([t]) => t === Messages.MessageType.MESSAGETYPE_ZCASHSIGNPCZT);
    const signPcztMsg = signPcztCall![1] as ZcashMessages.ZcashSignPCZT;
    expect(signPcztMsg.getNTransparentOutputs()).toBe(1);
    expect(signPcztMsg.hasNTransparentInputs()).toBe(false);

    // Output fields
    expect(capturedOutputMsg[0].getIndex()).toBe(0);
    expect(capturedOutputMsg[0].getAmount()).toBe(2500000);
    expect(Buffer.from(capturedOutputMsg[0].getScriptPubkey_asU8()).toString("hex"))
      .toBe("76a9149ef6ee0267fd387526020c265a470e2dad7f3b5e88ac");

    // Action[0] — change output: value must be OUTPUT note value (not 0 or spend value)
    expect(capturedActionMsg[0].getValue()).toBe(1358918);
    expect(capturedActionMsg[0].getIsSpend()).toBe(false);
    expect(capturedActionMsg[0].getRecipient_asU8()).toHaveLength(43);
    expect(capturedActionMsg[0].getRseed_asU8()).toHaveLength(32);

    // Action[1] — spend + dummy output: value=0 (dummy output), recipient/rseed still required
    expect(capturedActionMsg[1].getValue()).toBe(0);
    expect(capturedActionMsg[1].getIsSpend()).toBe(true);
    expect(capturedActionMsg[1].getRecipient_asU8()).toHaveLength(43);
    expect(capturedActionMsg[1].getRseed_asU8()).toHaveLength(32);

    // Deshield has a transparent phase (outputs) but no ECDSA sigs (no transparent inputs)
    expect(result).toHaveLength(2);
    expect((result as any)._transparentSignatures).toEqual([]);
  });
});

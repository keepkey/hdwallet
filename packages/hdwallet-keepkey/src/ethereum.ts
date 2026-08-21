import Common from "@ethereumjs/common";
import { FeeMarketEIP1559Transaction, Transaction } from "@ethereumjs/tx";
import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as Ethereum from "@keepkey/device-protocol/lib/messages-ethereum_pb";
import * as Types from "@keepkey/device-protocol/lib/types_pb";
import * as core from "@keepkey/hdwallet-core";
import { getStructHash } from "eip-712";
import * as eip55 from "eip55";
import * as jspb from "google-protobuf";

import { Eip712Call, Eip712Wire as Eip712WireShape, FieldType, runEip712Walk, TypedDataDoc } from "./eip712Streaming";
import * as Eip712Wire from "./eip712Wire";
import { Transport } from "./transport";
import { messageNameRegistry, messageTypeRegistry } from "./typeRegistry";
import { toUTF8Array } from "./utils";

// ── EVM Clear-Signing Message Types (firmware 7.14+) ─────────────────
// Message type IDs from device-protocol-clear-signing/messages.proto
const MESSAGETYPE_ETHEREUMTXMETADATA = 115;
const MESSAGETYPE_ETHEREUMMETADATAACK = 116;
const MESSAGETYPE_LOADCLEARSIGNSIGNER = 117;

// ── EVM Metadata Classification (from EthereumMetadataAck) ───────────
/** Device could not verify the blob (unsigned or unknown key) */
const _METADATA_OPAQUE = 0; // eslint-disable-line @typescript-eslint/no-unused-vars
/** Device verified the blob signature — OLED will show decoded info */
const METADATA_VERIFIED = 1;
/** Blob structure is invalid or corrupted */
const METADATA_MALFORMED = 2;

/**
 * EthereumTxMetadata: sent BEFORE EthereumSignTx to provide signed
 * metadata for clear-signing on the device OLED.
 *
 * Proto definition:
 *   message EthereumTxMetadata {
 *     optional bytes signed_payload = 1;
 *     optional uint32 metadata_version = 2;
 *     optional uint32 key_id = 3;
 *   }
 */
class EthereumTxMetadata extends jspb.Message {
  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, null, null);
  }

  getSignedPayload(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 1, "") as Uint8Array | string;
  }
  setSignedPayload(value: Uint8Array | string): void {
    jspb.Message.setField(this, 1, value);
  }

  getMetadataVersion(): number {
    return jspb.Message.getFieldWithDefault(this, 2, 1) as number;
  }
  setMetadataVersion(value: number): void {
    jspb.Message.setField(this, 2, value);
  }

  getKeyId(): number {
    return jspb.Message.getFieldWithDefault(this, 3, 0) as number;
  }
  setKeyId(value: number): void {
    jspb.Message.setField(this, 3, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    EthereumTxMetadata.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  static serializeBinaryToWriter(message: EthereumTxMetadata, writer: jspb.BinaryWriter): void {
    const payload = message.getSignedPayload();
    if (payload && (typeof payload === "string" ? payload.length > 0 : payload.length > 0)) {
      writer.writeBytes(1, payload);
    }
    // Always write metadata_version — device needs it to parse the blob correctly
    writer.writeUint32(2, message.getMetadataVersion());
    const keyId = message.getKeyId();
    if (keyId !== 0) writer.writeUint32(3, keyId);
  }

  static deserializeBinary(bytes: Uint8Array): EthereumTxMetadata {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new EthereumTxMetadata();
    return EthereumTxMetadata.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: EthereumTxMetadata, reader: jspb.BinaryReader): EthereumTxMetadata {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1:
          msg.setSignedPayload(reader.readBytes());
          break;
        case 2:
          msg.setMetadataVersion(reader.readUint32());
          break;
        case 3:
          msg.setKeyId(reader.readUint32());
          break;
        default:
          reader.skipField();
          break;
      }
    }
    return msg;
  }

  toObject(): { signedPayload: Uint8Array | string; metadataVersion: number; keyId: number } {
    return {
      signedPayload: this.getSignedPayload(),
      metadataVersion: this.getMetadataVersion(),
      keyId: this.getKeyId(),
    };
  }
  static toObject(_includeInstance: boolean, msg: EthereumTxMetadata) {
    return msg.toObject();
  }
}

/**
 * EthereumMetadataAck: device response after receiving EthereumTxMetadata.
 *
 * Proto definition:
 *   message EthereumMetadataAck {
 *     required uint32 classification = 1;  // 0=OPAQUE, 1=VERIFIED, 2=MALFORMED
 *     optional string display_summary = 2;
 *   }
 */
class EthereumMetadataAck extends jspb.Message {
  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, null, null);
  }

  /** 0=OPAQUE, 1=VERIFIED, 2=MALFORMED */
  getClassification(): number {
    return jspb.Message.getFieldWithDefault(this, 1, 0) as number;
  }

  getDisplaySummary(): string {
    return jspb.Message.getFieldWithDefault(this, 2, "") as string;
  }

  serializeBinary(): Uint8Array {
    // MetadataAck is device→host only, but implement properly for completeness
    const writer = new jspb.BinaryWriter();
    const c = this.getClassification();
    if (c !== 0) writer.writeUint32(1, c);
    const s = this.getDisplaySummary();
    if (s) writer.writeString(2, s);
    return writer.getResultBuffer();
  }

  static deserializeBinary(bytes: Uint8Array): EthereumMetadataAck {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new EthereumMetadataAck();
    return EthereumMetadataAck.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: EthereumMetadataAck, reader: jspb.BinaryReader): EthereumMetadataAck {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1:
          jspb.Message.setField(msg, 1, reader.readUint32());
          break;
        case 2:
          jspb.Message.setField(msg, 2, reader.readString());
          break;
        default:
          reader.skipField();
          break;
      }
    }
    return msg;
  }

  toObject(): { classification: number; displaySummary: string } {
    return { classification: this.getClassification(), displaySummary: this.getDisplaySummary() };
  }
  static toObject(_includeInstance: boolean, msg: EthereumMetadataAck) {
    return msg.toObject();
  }
}

/**
 * LoadClearsignSigner: load a runtime clear-signing signer (compressed pubkey
 * + alias) into a device key slot. Triggers a mandatory on-device confirmation;
 * RAM-only, dropped on reboot/WipeDevice. Metadata verified by a loaded signer
 * shows a warning screen naming the alias before every clear-sign page.
 *
 * Proto definition (device-protocol messages-ethereum.proto, msg type 117):
 *   message LoadClearsignSigner {
 *     optional uint32 key_id = 1;   // slot 1-3 (0 = built-in production, not loadable)
 *     optional bytes  pubkey = 2;   // 33-byte compressed secp256k1
 *     optional string alias  = 3;   // [A-Za-z0-9 _-], shown on the trust screen
 *   }
 * Host→device only; device replies Success (confirmed) or Failure (rejected).
 */
class LoadClearsignSigner extends jspb.Message {
  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, null, null);
  }

  setKeyId(value: number): void {
    jspb.Message.setField(this, 1, value);
  }
  setPubkey(value: Uint8Array | string): void {
    jspb.Message.setField(this, 2, value);
  }
  setAlias(value: string): void {
    jspb.Message.setField(this, 3, value);
  }
  setIcon(value: Uint8Array | string): void {
    jspb.Message.setField(this, 4, value);
  }
  setIconWidth(value: number): void {
    jspb.Message.setField(this, 5, value);
  }
  setIconHeight(value: number): void {
    jspb.Message.setField(this, 6, value);
  }
  setPersist(value: boolean): void {
    jspb.Message.setField(this, 7, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    LoadClearsignSigner.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  static serializeBinaryToWriter(message: LoadClearsignSigner, writer: jspb.BinaryWriter): void {
    writer.writeUint32(1, jspb.Message.getFieldWithDefault(message, 1, 0) as number);
    const pubkey = jspb.Message.getFieldWithDefault(message, 2, "") as Uint8Array | string;
    if (pubkey && (typeof pubkey === "string" ? pubkey.length > 0 : pubkey.length > 0)) {
      writer.writeBytes(2, pubkey);
    }
    const alias = jspb.Message.getFieldWithDefault(message, 3, "") as string;
    if (alias) writer.writeString(3, alias);
    const icon = jspb.Message.getFieldWithDefault(message, 4, "") as Uint8Array | string;
    if (icon && (typeof icon === "string" ? icon.length > 0 : icon.length > 0)) {
      writer.writeBytes(4, icon);
      writer.writeUint32(5, jspb.Message.getFieldWithDefault(message, 5, 0) as number);
      writer.writeUint32(6, jspb.Message.getFieldWithDefault(message, 6, 0) as number);
    }
    const persist = jspb.Message.getFieldWithDefault(message, 7, false) as boolean;
    if (persist) writer.writeBool(7, persist);
  }

  static deserializeBinary(bytes: Uint8Array): LoadClearsignSigner {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new LoadClearsignSigner();
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1:
          jspb.Message.setField(msg, 1, reader.readUint32());
          break;
        case 2:
          jspb.Message.setField(msg, 2, reader.readBytes());
          break;
        case 3:
          jspb.Message.setField(msg, 3, reader.readString());
          break;
        case 4:
          jspb.Message.setField(msg, 4, reader.readBytes());
          break;
        case 5:
          jspb.Message.setField(msg, 5, reader.readUint32());
          break;
        case 6:
          jspb.Message.setField(msg, 6, reader.readUint32());
          break;
        case 7:
          jspb.Message.setField(msg, 7, reader.readBool());
          break;
        default:
          reader.skipField();
          break;
      }
    }
    return msg;
  }

  toObject(): { keyId: number; pubkey: Uint8Array | string; alias: string } {
    return {
      keyId: jspb.Message.getFieldWithDefault(this, 1, 0) as number,
      pubkey: jspb.Message.getFieldWithDefault(this, 2, "") as Uint8Array | string,
      alias: jspb.Message.getFieldWithDefault(this, 3, "") as string,
    };
  }
  static toObject(_includeInstance: boolean, msg: LoadClearsignSigner) {
    return msg.toObject();
  }
}

// ── Register EVM clear-signing messages ──────────────────────────────
function registerEthClearSignMessages() {
  const mt = Messages.MessageType as unknown as Record<string, number>;
  mt["MESSAGETYPE_ETHEREUMTXMETADATA"] = MESSAGETYPE_ETHEREUMTXMETADATA;
  mt["MESSAGETYPE_ETHEREUMMETADATAACK"] = MESSAGETYPE_ETHEREUMMETADATAACK;
  mt["MESSAGETYPE_LOADCLEARSIGNSIGNER"] = MESSAGETYPE_LOADCLEARSIGNSIGNER;

  messageNameRegistry[MESSAGETYPE_ETHEREUMTXMETADATA] = "EthereumTxMetadata";
  messageNameRegistry[MESSAGETYPE_ETHEREUMMETADATAACK] = "EthereumMetadataAck";
  messageNameRegistry[MESSAGETYPE_LOADCLEARSIGNSIGNER] = "LoadClearsignSigner";

  messageTypeRegistry[MESSAGETYPE_ETHEREUMTXMETADATA] = EthereumTxMetadata as any;
  messageTypeRegistry[MESSAGETYPE_ETHEREUMMETADATAACK] = EthereumMetadataAck as any;
  messageTypeRegistry[MESSAGETYPE_LOADCLEARSIGNSIGNER] = LoadClearsignSigner as any;
}
registerEthClearSignMessages();

function isHexString(value: string): boolean {
  return typeof value === "string" && /^0x[0-9a-fA-F]*$/.test(value);
}

function isBytes(value: unknown): value is Uint8Array {
  if (value instanceof Uint8Array) return true;
  if (!Array.isArray(value)) return false;
  for (const v of value) {
    if (typeof v !== "number" || v < 0 || v >= 256 || v % 1 !== 0) return false;
  }
  return true;
}

function arrayify(value: string | Uint8Array): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (typeof value === "string") return core.arrayify(value);
  throw new Error("invalid arrayify value");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function ethSupportsNetwork(chainId: number): Promise<boolean> {
  return true;
}

export async function ethSupportsSecureTransfer(): Promise<boolean> {
  return true;
}

export function ethSupportsNativeShapeShift(): boolean {
  return true;
}

export function ethGetAccountPaths(msg: core.ETHGetAccountPath): Array<core.ETHAccountPath> {
  const slip44 = core.slip44ByCoin(msg.coin);
  if (slip44 === undefined) return [];
  return [
    {
      addressNList: [0x80000000 + 44, 0x80000000 + slip44, 0x80000000 + msg.accountIdx, 0, 0],
      hardenedPath: [0x80000000 + 44, 0x80000000 + slip44, 0x80000000 + msg.accountIdx],
      relPath: [0, 0],
      description: "KeepKey",
    },
  ];
}

function stripLeadingZeroes(buf: Uint8Array) {
  const firstZeroIndex = buf.findIndex((x) => x !== 0);
  return buf.slice(firstZeroIndex !== -1 ? firstZeroIndex : buf.length);
}

export async function ethSignTx(transport: Transport, msg: core.ETHSignTx): Promise<core.ETHSignedTx> {
  return transport.lockDuring(async () => {
    // ── EVM Clear-Signing: send metadata BEFORE EthereumSignTx ──────
    // If txMetadata is present, the firmware can verify the signed blob
    // and display decoded contract call info on the OLED instead of raw hex.
    if (msg.txMetadata?.signedPayload) {
      const meta = new EthereumTxMetadata();
      const payload = msg.txMetadata.signedPayload;
      if (typeof payload === "string") {
        // Hex string → bytes
        meta.setSignedPayload(core.arrayify(payload.startsWith("0x") ? payload : "0x" + payload));
      } else {
        meta.setSignedPayload(payload);
      }
      if (msg.txMetadata.keyId !== undefined) {
        meta.setKeyId(msg.txMetadata.keyId);
      }
      if (msg.txMetadata.metadataVersion !== undefined) {
        meta.setMetadataVersion(msg.txMetadata.metadataVersion);
      }

      try {
        const metaResponse = await transport.call(MESSAGETYPE_ETHEREUMTXMETADATA, meta, {
          msgTimeout: core.DEFAULT_TIMEOUT,
          omitLock: true,
        });
        const ack = metaResponse.proto as EthereumMetadataAck;
        const classification = ack.getClassification();
        const classLabel =
          classification === METADATA_VERIFIED
            ? "VERIFIED"
            : classification === METADATA_MALFORMED
            ? "MALFORMED"
            : "OPAQUE";
        // eslint-disable-next-line no-console -- intentional diagnostics for clear-sign debugging
        console.warn(
          `[hdwallet] EthereumTxMetadata response: ${classLabel} (${classification})` +
            ` summary="${ack.getDisplaySummary()}"`
        );
        if (classification === METADATA_MALFORMED) {
          console.warn("[hdwallet] Metadata blob is MALFORMED — device will fall back to blind signing");
        }
      } catch (e) {
        // Metadata send failed — fall through to regular signing (blind mode)
        // This is non-fatal: older firmware versions don't support this message.
        console.warn("[hdwallet] EthereumTxMetadata not supported or failed, falling back to blind signing:", e);
      }
    }

    const est: Ethereum.EthereumSignTx = new Ethereum.EthereumSignTx();
    est.setAddressNList(msg.addressNList);
    est.setNonce(stripLeadingZeroes(core.arrayify(msg.nonce)));
    est.setGasLimit(core.arrayify(msg.gasLimit));
    if (msg.gasPrice) {
      est.setGasPrice(core.arrayify(msg.gasPrice));
    }
    if (msg.maxFeePerGas) {
      est.setMaxFeePerGas(core.arrayify(msg.maxFeePerGas));
      est.setType(core.ETHTransactionType.ETH_TX_TYPE_EIP_1559);
      if (msg.maxPriorityFeePerGas) {
        est.setMaxPriorityFeePerGas(core.arrayify(msg.maxPriorityFeePerGas));
      }
    }

    if (msg.value.match("^0x0*$") === null) {
      est.setValue(core.arrayify(msg.value));
    }

    if (msg.toAddressNList) {
      est.setAddressType(Types.OutputAddressType.SPEND);
      est.setToAddressNList(msg.toAddressNList);
    } else {
      est.setAddressType(Types.OutputAddressType.SPEND);
    }

    if (msg.to) {
      est.setTo(core.arrayify(msg.to));
    }

    let dataChunk: Uint8Array | null | undefined = null;
    let dataRemaining: Uint8Array | null | undefined = undefined;

    if (msg.data) {
      dataRemaining = core.arrayify(msg.data);
      est.setDataLength(dataRemaining.length);
      dataChunk = dataRemaining.slice(0, 1024);
      dataRemaining = dataRemaining.slice(dataChunk.length);
      est.setDataInitialChunk(dataChunk);
    }

    if (msg.chainId !== undefined) {
      est.setChainId(msg.chainId);
    }

    let response: Ethereum.EthereumTxRequest;
    let nextResponse = await transport.call(Messages.MessageType.MESSAGETYPE_ETHEREUMSIGNTX, est, {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });
    response = nextResponse.proto as Ethereum.EthereumTxRequest;
    try {
      const esa: Ethereum.EthereumTxAck = new Ethereum.EthereumTxAck();
      while (response.hasDataLength()) {
        const dataLength = response.getDataLength();
        dataRemaining = core.mustBeDefined(dataRemaining);
        dataChunk = dataRemaining.slice(0, dataLength);
        dataRemaining = dataRemaining.slice(dataLength, dataRemaining.length);

        esa.setDataChunk(dataChunk);
        nextResponse = await transport.call(Messages.MessageType.MESSAGETYPE_ETHEREUMTXACK, esa, {
          msgTimeout: core.LONG_TIMEOUT,
          omitLock: true,
        });
        response = nextResponse.proto as Ethereum.EthereumTxRequest;
      }
    } catch (error) {
      console.error({ error });
      throw new Error("Failed to sign ETH transaction");
    }

    const utxBase = {
      to: msg.to,
      value: msg.value,
      data: msg.data,
      chainId: msg.chainId,
      nonce: msg.nonce,
      gasLimit: msg.gasLimit,
      maxFeePerGas: msg.maxFeePerGas,
      maxPriorityFeePerGas: msg.maxPriorityFeePerGas,
    };

    const r = "0x" + core.toHexString(response.getSignatureR_asU8());
    const s = "0x" + core.toHexString(response.getSignatureS_asU8());
    if (!response.hasSignatureV()) throw new Error("could not get v");
    const v = core.mustBeDefined(response.getSignatureV());
    const v2 = "0x" + v.toString(16);

    // Capture the firmware-reported pre-image hash (KeepKey custom field).
    // Older firmware doesn't populate this; absence is non-fatal.
    let deviceSignedHash: string | undefined;
    try {
      if (response.hasHash && response.hasHash() && response.getHash_asU8) {
        const h = response.getHash_asU8();
        if (h && h.length === 32) {
          deviceSignedHash = "0x" + core.toHexString(h);
        }
      }
    } catch {
      // ignore — older firmware/proto may not support `hash`
    }

    const common = Common.custom({ chainId: msg.chainId });
    const tx = msg.maxFeePerGas
      ? FeeMarketEIP1559Transaction.fromTxData({
          ...utxBase,
          maxFeePerGas: msg.maxFeePerGas,
          maxPriorityFeePerGas: msg.maxPriorityFeePerGas,
          r: r,
          s: s,
          v: v2,
        })
      : Transaction.fromTxData({ ...utxBase, gasPrice: msg.gasPrice, r: r, s: s, v: v2 }, { common });

    const result: core.ETHSignedTx = {
      r,
      s,
      v,
      serialized: "0x" + core.toHexString(tx.serialize()),
    };
    if (deviceSignedHash) result.deviceSignedHash = deviceSignedHash;
    return result;
  });
}

/**
 * Load a runtime clear-sign signer into a device key slot (RAM-only). Sends
 * LoadClearsignSigner (msg 117); the device shows a mandatory trust-confirm
 * screen naming the alias + the pubkey fingerprint. Resolves on Success,
 * rejects (via transport.call throwing) on device Failure/cancel.
 */
export async function ethLoadClearsignSigner(
  transport: Transport,
  msg: {
    keyId: number;
    pubkey: Uint8Array;
    alias: string;
    /** Optional identity logo: 1bpp mono RLE bitmap, <= 384 bytes. */
    icon?: Uint8Array;
    iconWidth?: number;
    iconHeight?: number;
    /** @deprecated ClearSign identities are intentionally RAM-only. */
    persist?: boolean;
  }
): Promise<{ ok: true }> {
  return transport.lockDuring(async () => {
    if (msg.persist) throw new Error("Persistent ClearSign signers are not supported; use a RAM-only session signer");
    const m = new LoadClearsignSigner();
    m.setKeyId(msg.keyId);
    m.setPubkey(msg.pubkey);
    m.setAlias(msg.alias);
    if (msg.icon && msg.icon.length > 0) {
      m.setIcon(msg.icon);
      m.setIconWidth(msg.iconWidth ?? 0);
      m.setIconHeight(msg.iconHeight ?? 0);
    }
    await transport.call(MESSAGETYPE_LOADCLEARSIGNSIGNER, m, {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });
    return { ok: true };
  });
}

export async function ethGetAddress(transport: Transport, msg: core.ETHGetAddress): Promise<string> {
  const getAddr = new Ethereum.EthereumGetAddress();
  getAddr.setAddressNList(msg.addressNList);
  getAddr.setShowDisplay(msg.showDisplay !== false);
  const response = await transport.call(Messages.MessageType.MESSAGETYPE_ETHEREUMGETADDRESS, getAddr, {
    msgTimeout: core.LONG_TIMEOUT,
  });
  const ethAddress = response.proto as Ethereum.EthereumAddress;

  let address: string;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  if (ethAddress.hasAddressStr()) address = ethAddress.getAddressStr()!;
  else if (ethAddress.hasAddress()) address = "0x" + core.toHexString(ethAddress.getAddress_asU8());
  else throw new Error("Unable to obtain ETH address from device.");

  return address;
}

export async function ethSignMessage(transport: Transport, msg: core.ETHSignMessage): Promise<core.ETHSignedMessage> {
  const { addressNList, message } = msg;
  if (!isHexString(message)) throw new Error("data is not an hex string");
  const m = new Ethereum.EthereumSignMessage();
  m.setAddressNList(addressNList);
  const messageBytes = arrayify(message);
  m.setMessage(messageBytes);
  const response = await transport.call(Messages.MessageType.MESSAGETYPE_ETHEREUMSIGNMESSAGE, m, {
    msgTimeout: core.LONG_TIMEOUT,
  });
  const sig = response.proto as Ethereum.EthereumMessageSignature;
  return {
    address: eip55.encode("0x" + core.toHexString(sig.getAddress_asU8())), // FIXME: this should be done in the firmware
    signature: "0x" + core.toHexString(sig.getSignature_asU8()),
  };
}

const EIP3009_TRANSFER_WITH_AUTHORIZATION = [
  { name: "from", type: "address" },
  { name: "to", type: "address" },
  { name: "value", type: "uint256" },
  { name: "validAfter", type: "uint256" },
  { name: "validBefore", type: "uint256" },
  { name: "nonce", type: "bytes32" },
] as const;

function typedDataJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? item.toString() : item));
}

function withEip712DomainType(typedData: any): any {
  if (Array.isArray(typedData.types?.EIP712Domain)) return typedData;

  const domain = typedData.domain || {};
  const canonicalFields = [
    ["name", "string"],
    ["version", "string"],
    ["chainId", "uint256"],
    ["verifyingContract", "address"],
    ["salt", "bytes32"],
  ] as const;
  const domainType = canonicalFields
    .filter(([name]) => domain[name] !== undefined)
    .map(([name, type]) => ({ name, type }));

  return {
    ...typedData,
    types: { ...(typedData.types || {}), EIP712Domain: domainType },
  };
}

function isX402Eip3009(typedData: any): boolean {
  if (typedData.primaryType !== "TransferWithAuthorization") return false;
  const fields = typedData.types?.TransferWithAuthorization;
  if (!Array.isArray(fields) || fields.length !== EIP3009_TRANSFER_WITH_AUTHORIZATION.length) return false;
  return EIP3009_TRANSFER_WITH_AUTHORIZATION.every(
    (expected, index) => fields[index]?.name === expected.name && fields[index]?.type === expected.type
  );
}

/** The firmware's own words when it refused.
 *
 * transport.call throws the raw failure event -- `{ message_enum:
 * MESSAGETYPE_FAILURE, message: Failure.toObject() }` -- so the device's text
 * is at `.message.message`. Every caller that flattens this to a generic string
 * throws away the only explanation the user can act on.
 */
function firmwareFailureText(error: unknown): string | undefined {
  if (!core.isIndexable(error)) return undefined;
  if (error.message_enum !== Messages.MessageType.MESSAGETYPE_FAILURE) return undefined;
  const failure = error.message as { message?: string } | undefined;
  const text = failure?.message;
  return typeof text === "string" && text.length > 0 ? text : undefined;
}

/** Did the device refuse because it has no structured EIP-712 endpoint?
 *
 * Firmware 7.14.2 withdrew the structured path -- its JSON parser could not
 * guarantee the displayed value was the value being hashed -- and answers
 * Ethereum712TypesValues with "Structured EIP-712 disabled pending canonical
 * display hardening". Firmware that predates the message answers
 * Failure_UnexpectedMessage.
 *
 * Both mean the same thing to us: this device cannot parse typed data, so use
 * the hashed path. Detecting it by ATTEMPT rather than by version number is
 * deliberate -- there is no capability bit for this, and a version table would
 * need updating for every branch that toggles the flag.
 *
 * Safe to retry after: the firmware refuses at the top of the handler, before
 * it touches any session state, so nothing partial is left behind.
 */
function structuredEip712Unavailable(error: unknown): boolean {
  if (!core.isIndexable(error)) return false;
  if (error.message_enum !== Messages.MessageType.MESSAGETYPE_FAILURE) return false;
  const failure = error.message as { code?: number; message?: string } | undefined;
  if (failure?.code === Types.FailureType.FAILURE_UNEXPECTEDMESSAGE) return true;
  const text = typeof failure?.message === "string" ? failure.message : "";
  // Withdrawn in 7.14.2.
  if (text.includes("Structured EIP-712 disabled")) return true;
  // Present, but cannot walk THIS document. Arrays are the current gap:
  // PermitBatch and Seaport nest them. Degrading costs the user the field
  // display and keeps the payment working, which is the same deal every
  // typed-data payload gets today -- a hard failure would be strictly worse
  // and would look like a bug rather than a limitation.
  if (text.includes("arrays are not supported")) return true;
  return false;
}

/**
 * Structured EIP-712 over the streaming protocol: the device walks the document
 * and hashes each leaf in the same call that displays it.
 *
 * Fails to the hashed path on firmware that does not implement it, via the same
 * structuredEip712Unavailable() test the x402 branch uses.
 */
async function signTypedDataStreaming(
  transport: Transport,
  addressNList: number[],
  typedData: TypedDataDoc
): Promise<core.ETHSignedTypedData> {
  const wire: Eip712WireShape = {
    SIGN: Eip712Wire.MESSAGETYPE_ETHEREUMSIGNTYPEDDATA,
    STRUCT_REQUEST: Eip712Wire.MESSAGETYPE_ETHEREUMTYPEDDATASTRUCTREQUEST,
    STRUCT_ACK: Eip712Wire.MESSAGETYPE_ETHEREUMTYPEDDATASTRUCTACK,
    VALUE_REQUEST: Eip712Wire.MESSAGETYPE_ETHEREUMTYPEDDATAVALUEREQUEST,
    VALUE_ACK: Eip712Wire.MESSAGETYPE_ETHEREUMTYPEDDATAVALUEACK,
    SIGNATURE: Messages.MessageType.MESSAGETYPE_ETHEREUMTYPEDDATASIGNATURE,

    encodeSign: (n: number[], primaryType: string) => {
      const m = new Eip712Wire.EthereumSignTypedData();
      m.setAddressNList(n);
      m.setPrimaryType(primaryType);
      // v3 hashes arrays of structs differently. We speak v4 only, and the
      // device refuses anything else rather than guessing.
      m.setMetamaskV4Compat(true);
      return m.serializeBinary();
    },
    decodeStructRequest: (b: Uint8Array) => Eip712Wire.EthereumTypedDataStructRequest.deserializeBinary(b).getName(),
    encodeStructAck: (members: Array<{ name: string; type: FieldType }>) =>
      new Eip712Wire.EthereumTypedDataStructAck(members).serializeBinary(),
    decodeValueRequest: (b: Uint8Array) =>
      Eip712Wire.EthereumTypedDataValueRequest.deserializeBinary(b).getMemberPathList(),
    encodeValueAck: (v: Uint8Array) => {
      const m = new Eip712Wire.EthereumTypedDataValueAck();
      m.setValue(v);
      return m.serializeBinary();
    },
    decodeSignature: (b: Uint8Array) => {
      const r = Ethereum.EthereumTypedDataSignature.deserializeBinary(b);
      return {
        address: r.getAddress() || "",
        signature: "0x" + core.toHexString(r.getSignature_asU8()),
      };
    },
  };

  const call: Eip712Call = async (messageType: number, payload: Uint8Array) => {
    const event = await transport.call(messageType, new Eip712Wire.RawPayload(payload), {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });
    const proto = event.proto as jspb.Message;
    return { type: event.message_enum as number, payload: proto.serializeBinary() };
  };

  const out = await runEip712Walk(typedData, addressNList, wire, call);
  return { address: out.address, signature: out.signature };
}

async function signStructuredEip712(
  transport: Transport,
  addressNList: number[],
  typedData: any
): Promise<core.ETHSignedTypedData> {
  const typesJson = typedDataJson({ types: typedData.types });
  const primaryTypeJson = typedDataJson({ primaryType: typedData.primaryType });
  const domainJson = typedDataJson({ domain: typedData.domain || {} });
  const messageJson = typedDataJson({ message: typedData.message || {} });

  if (typesJson.length > 2048 || domainJson.length > 2048 || messageJson.length > 2048) {
    throw new Error("Structured EIP-712 data exceeds firmware limits");
  }
  if (primaryTypeJson.length > 80) throw new Error("EIP-712 primary type exceeds firmware limits");

  const request = (data: string, typeValues: number) => {
    const value = new Ethereum.Ethereum712TypesValues();
    value.setAddressNList(addressNList);
    value.setEip712types(typesJson);
    value.setEip712primetype(primaryTypeJson);
    value.setEip712data(data);
    value.setEip712typevals(typeValues);
    return value;
  };

  // Firmware computes and retains the domain separator, then combines it with
  // the independently reviewed message hash in the second request.
  await transport.call(Messages.MessageType.MESSAGETYPE_ETHEREUM712TYPESVALUES, request(domainJson, 1), {
    msgTimeout: core.LONG_TIMEOUT,
    omitLock: true,
  });
  const response = await transport.call(
    Messages.MessageType.MESSAGETYPE_ETHEREUM712TYPESVALUES,
    request(messageJson, 2),
    { msgTimeout: core.LONG_TIMEOUT, omitLock: true }
  );
  const result = response.proto as Ethereum.EthereumTypedDataSignature;
  return {
    address: result.getAddress() || "",
    signature: "0x" + core.toHexString(result.getSignature_asU8()),
  };
}

/**
 * Supports EIP-712 eth_signTypedData_v4.
 *
 * x402's EIP-3009 TransferWithAuthorization uses the firmware's structured
 * endpoint so the device hashes and displays the actual payment fields.
 * Other typed data keeps the legacy hash path, which firmware protects with
 * the AdvancedMode blind-signing gate.
 */
export async function ethSignTypedData(
  transport: Transport,
  msg: core.ETHSignTypedData
): Promise<core.ETHSignedTypedData> {
  try {
    return await transport.lockDuring(async () => {
      const EIP_712_DOMAIN = "EIP712Domain";
      const typedData = withEip712DomainType(msg.typedData);
      const { primaryType, domain, message } = typedData;

      // Prefer the streaming path for EVERY document: the device parses and
      // displays the fields itself, instead of signing two opaque hashes.
      try {
        return await signTypedDataStreaming(transport, msg.addressNList, typedData as unknown as TypedDataDoc);
      } catch (e) {
        // Only "this firmware has no structured endpoint" degrades. Anything
        // else -- a refused screen, a malformed document, an array this
        // firmware cannot walk -- is a real answer and must not be masked.
        if (!structuredEip712Unavailable(e)) throw e;
      }

      if (isX402Eip3009(typedData)) {
        try {
          return await signStructuredEip712(transport, msg.addressNList, typedData);
        } catch (e) {
          // Anything other than "this device has no structured endpoint" is a
          // real error and must not be masked by a silent downgrade.
          if (!structuredEip712Unavailable(e)) throw e;
          // Fall through to the hashed path. The user still sees the device's
          // blind-sign warning and still has to have AdvancedMode on, so this
          // is not a silent loss of protection -- it is the same treatment
          // every other typed-data payload already gets on this firmware.
        }
      }
      // eip-712 getStructHash is a 1:1 byte-identical replacement for
      // @metamask/eth-sig-util TypedDataUtils.hashStruct(..., V4) — verified across
      // nested-struct, struct-array (V4) and Permit2 payloads — and drops the heavy
      // @ethereumjs@4/@metamask-utils nested tree (Windows MAX_PATH risk).
      const domainSeparatorHash: Uint8Array = getStructHash(typedData, EIP_712_DOMAIN, domain);

      const ethereumSignTypedHash = new Ethereum.EthereumSignTypedHash();
      ethereumSignTypedHash.setAddressNList(msg.addressNList);
      ethereumSignTypedHash.setDomainSeparatorHash(domainSeparatorHash);

      let messageHash: Uint8Array | undefined = undefined;
      // If "EIP712Domain" is the primaryType, messageHash is not required - look at T1 connect impl ;)
      // todo: the firmware should define messageHash as an optional Uint8Array field for this case
      if (primaryType !== EIP_712_DOMAIN) {
        messageHash = getStructHash(typedData, primaryType, message);
        ethereumSignTypedHash.setMessageHash(messageHash);
      }

      const response = await transport.call(
        Messages.MessageType.MESSAGETYPE_ETHEREUMSIGNTYPEDHASH,
        ethereumSignTypedHash,
        {
          msgTimeout: core.LONG_TIMEOUT,
          omitLock: true,
        }
      );

      const result = response.proto as Ethereum.EthereumTypedDataSignature;
      return {
        address: result.getAddress() || "",
        signature: "0x" + core.toHexString(result.getSignature_asU8()),
      };
    });
  } catch (error) {
    console.error({ error });
    // Surface what the device actually said. "Failed to sign typed ETH message"
    // is the same string whether the user needs to enable AdvancedMode, the
    // firmware withdrew the structured endpoint, or the cable fell out -- and
    // the one thing a user can act on is the difference between those.
    const detail = firmwareFailureText(error);
    if (detail) throw new Error(detail);
    if (error instanceof Error) throw error;
    throw new Error("Failed to sign typed ETH message");
  }
}

export async function ethVerifyMessage(transport: Transport, msg: core.ETHVerifyMessage): Promise<boolean> {
  const m = new Ethereum.EthereumVerifyMessage();
  m.setAddress(core.arrayify(msg.address));
  m.setSignature(core.arrayify(msg.signature));
  m.setMessage(isBytes(msg.message) ? new Uint8Array(msg.message) : toUTF8Array(msg.message as string));
  let event: core.Event;
  try {
    event = await transport.call(Messages.MessageType.MESSAGETYPE_ETHEREUMVERIFYMESSAGE, m, {
      msgTimeout: core.LONG_TIMEOUT,
    });
  } catch (e) {
    if (core.isIndexable(e) && e.message_enum === Messages.MessageType.MESSAGETYPE_FAILURE) {
      return false;
    }
    throw e;
  }
  const success = event.proto as Messages.Success;
  return success.getMessage() === "Message verified";
}

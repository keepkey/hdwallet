import Common from "@ethereumjs/common";
import { FeeMarketEIP1559Transaction, Transaction } from "@ethereumjs/tx";
import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as Ethereum from "@keepkey/device-protocol/lib/messages-ethereum_pb";
import * as Types from "@keepkey/device-protocol/lib/types_pb";
import * as core from "@keepkey/hdwallet-core";
import { SignTypedDataVersion, TypedDataUtils } from "@metamask/eth-sig-util";
import * as eip55 from "eip55";
import * as jspb from "google-protobuf";

import { Transport } from "./transport";
import { messageNameRegistry, messageTypeRegistry } from "./typeRegistry";
import { toUTF8Array } from "./utils";

// ── EVM Clear-Signing Message Types (firmware 7.14+) ─────────────────
// Message type IDs from device-protocol-clear-signing/messages.proto
const MESSAGETYPE_ETHEREUMTXMETADATA = 115;
const MESSAGETYPE_ETHEREUMMETADATAACK = 116;

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

// ── Register EVM clear-signing messages ──────────────────────────────
function registerEthClearSignMessages() {
  const mt = Messages.MessageType as unknown as Record<string, number>;
  mt["MESSAGETYPE_ETHEREUMTXMETADATA"] = MESSAGETYPE_ETHEREUMTXMETADATA;
  mt["MESSAGETYPE_ETHEREUMMETADATAACK"] = MESSAGETYPE_ETHEREUMMETADATAACK;

  messageNameRegistry[MESSAGETYPE_ETHEREUMTXMETADATA] = "EthereumTxMetadata";
  messageNameRegistry[MESSAGETYPE_ETHEREUMMETADATAACK] = "EthereumMetadataAck";

  messageTypeRegistry[MESSAGETYPE_ETHEREUMTXMETADATA] = EthereumTxMetadata as any;
  messageTypeRegistry[MESSAGETYPE_ETHEREUMMETADATAACK] = EthereumMetadataAck as any;
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

    return {
      r,
      s,
      v,
      serialized: "0x" + core.toHexString(tx.serialize()),
    };
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

/**
 * Supports EIP-712 eth_signTypedData_v4
 * https://docs.metamask.io/wallet/how-to/sign-data/#use-eth_signtypeddata_v4
 * Due to lack of firmware support, a hashed version of the data is
 * displayed to the user on the device when signing
 */
export async function ethSignTypedData(
  transport: Transport,
  msg: core.ETHSignTypedData
): Promise<core.ETHSignedTypedData> {
  try {
    const version = SignTypedDataVersion.V4;
    const EIP_712_DOMAIN = "EIP712Domain";
    const { types, primaryType, domain, message } = msg.typedData;
    const domainSeparatorHash: Uint8Array = TypedDataUtils.hashStruct(EIP_712_DOMAIN, domain, types, version);

    const ethereumSignTypedHash = new Ethereum.EthereumSignTypedHash();
    ethereumSignTypedHash.setAddressNList(msg.addressNList);
    ethereumSignTypedHash.setDomainSeparatorHash(domainSeparatorHash);

    let messageHash: Uint8Array | undefined = undefined;
    // If "EIP712Domain" is the primaryType, messageHash is not required - look at T1 connect impl ;)
    // todo: the firmware should define messageHash as an optional Uint8Array field for this case
    if (primaryType !== EIP_712_DOMAIN) {
      messageHash = TypedDataUtils.hashStruct(primaryType, message, types, version);
      ethereumSignTypedHash.setMessageHash(messageHash);
    }

    const response = await transport.call(
      Messages.MessageType.MESSAGETYPE_ETHEREUMSIGNTYPEDHASH,
      ethereumSignTypedHash,
      {
        msgTimeout: core.LONG_TIMEOUT,
      }
    );

    const result = response.proto as Ethereum.EthereumTypedDataSignature;
    const res: core.ETHSignedTypedData = {
      address: result.getAddress() || "",
      signature: "0x" + core.toHexString(result.getSignature_asU8()),
    };

    return res;
  } catch (error) {
    console.error({ error });
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

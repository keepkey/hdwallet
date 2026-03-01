import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as core from "@keepkey/hdwallet-core";
import * as jspb from "google-protobuf";

import { Transport } from "./transport";
import { messageNameRegistry, messageTypeRegistry } from "./typeRegistry";

// Cast to access methods that exist at runtime but not in @types/google-protobuf
const Msg = jspb.Message as any;

// ── Solana Message Type IDs (from messages.proto) ─────────────────────
const MESSAGETYPE_SOLANAGETADDRESS = 750;
const MESSAGETYPE_SOLANAADDRESS = 751;
const MESSAGETYPE_SOLANASIGNTX = 752;
const MESSAGETYPE_SOLANASIGNEDTX = 753;
const MESSAGETYPE_SOLANASIGNMESSAGE = 754;
const MESSAGETYPE_SOLANAMESSAGESIGNATURE = 755;

// ── Protobuf Shims ──────────────────────────────────────────────────
// Hand-rolled jspb.Message subclasses matching messages-solana.proto.
// These are wire-compatible with the firmware's protobuf encoding.

/**
 * SolanaGetAddress: address_n(1, repeated uint32), coin_name(2, string), show_display(3, bool)
 */
export class SolanaGetAddress extends jspb.Message {
  static repeatedFields_ = [1];

  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, SolanaGetAddress.repeatedFields_, null);
  }

  getAddressNList(): number[] {
    return Msg.getRepeatedField(this, 1) as number[];
  }
  setAddressNList(value: number[]): void {
    jspb.Message.setField(this, 1, value || []);
  }
  addAddressN(value: number): void {
    jspb.Message.addToRepeatedField(this, 1, value);
  }

  getCoinName(): string | undefined {
    return jspb.Message.getFieldWithDefault(this, 2, "Solana") as string;
  }
  setCoinName(value: string): void {
    jspb.Message.setField(this, 2, value);
  }

  getShowDisplay(): boolean | undefined {
    const f = jspb.Message.getField(this, 3);
    return f == null ? undefined : !!f;
  }
  setShowDisplay(value: boolean): void {
    jspb.Message.setField(this, 3, value ? 1 : 0);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    SolanaGetAddress.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(_includeInstance?: boolean): SolanaGetAddress.AsObject {
    return {
      addressNList: this.getAddressNList(),
      coinName: this.getCoinName(),
      showDisplay: this.getShowDisplay(),
    };
  }

  static toObject(_includeInstance: boolean, msg: SolanaGetAddress): SolanaGetAddress.AsObject {
    return msg.toObject(_includeInstance);
  }

  static deserializeBinary(bytes: Uint8Array): SolanaGetAddress {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new SolanaGetAddress();
    return SolanaGetAddress.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: SolanaGetAddress, reader: jspb.BinaryReader): SolanaGetAddress {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      const field = reader.getFieldNumber();
      switch (field) {
        case 1: {
          const values = reader.isDelimited() ? reader.readPackedUint32() : [reader.readUint32()];
          for (const v of values) msg.addAddressN(v);
          break;
        }
        case 2:
          msg.setCoinName(reader.readString());
          break;
        case 3:
          msg.setShowDisplay(reader.readBool());
          break;
        default:
          reader.skipField();
          break;
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: SolanaGetAddress, writer: jspb.BinaryWriter): void {
    const addressN = message.getAddressNList();
    if (addressN.length > 0) {
      writer.writeRepeatedUint32(1, addressN);
    }
    const coinName = jspb.Message.getField(message, 2) as string | null;
    if (coinName != null) {
      writer.writeString(2, coinName);
    }
    const showDisplay = jspb.Message.getField(message, 3);
    if (showDisplay != null) {
      writer.writeBool(3, !!showDisplay);
    }
  }
}

export namespace SolanaGetAddress {
  export type AsObject = {
    addressNList: number[];
    coinName?: string;
    showDisplay?: boolean;
  };
}

/**
 * SolanaAddress: address(1, string)
 */
export class SolanaAddress extends jspb.Message {
  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, null, null);
  }

  getAddress(): string | undefined {
    return jspb.Message.getFieldWithDefault(this, 1, "") as string;
  }
  setAddress(value: string): void {
    jspb.Message.setField(this, 1, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    SolanaAddress.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(_includeInstance?: boolean): SolanaAddress.AsObject {
    return { address: this.getAddress() };
  }

  static toObject(_includeInstance: boolean, msg: SolanaAddress): SolanaAddress.AsObject {
    return msg.toObject(_includeInstance);
  }

  static deserializeBinary(bytes: Uint8Array): SolanaAddress {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new SolanaAddress();
    return SolanaAddress.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: SolanaAddress, reader: jspb.BinaryReader): SolanaAddress {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      const field = reader.getFieldNumber();
      switch (field) {
        case 1:
          msg.setAddress(reader.readString());
          break;
        default:
          reader.skipField();
          break;
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: SolanaAddress, writer: jspb.BinaryWriter): void {
    const address = jspb.Message.getField(message, 1) as string | null;
    if (address != null) {
      writer.writeString(1, address);
    }
  }
}

export namespace SolanaAddress {
  export type AsObject = {
    address?: string;
  };
}

/**
 * SolanaSignTx: address_n(1, repeated uint32), coin_name(2, string), raw_tx(3, bytes)
 */
export class SolanaSignTx extends jspb.Message {
  static repeatedFields_ = [1];

  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, SolanaSignTx.repeatedFields_, null);
  }

  getAddressNList(): number[] {
    return Msg.getRepeatedField(this, 1) as number[];
  }
  setAddressNList(value: number[]): void {
    jspb.Message.setField(this, 1, value || []);
  }
  addAddressN(value: number): void {
    jspb.Message.addToRepeatedField(this, 1, value);
  }

  getCoinName(): string | undefined {
    return jspb.Message.getFieldWithDefault(this, 2, "Solana") as string;
  }
  setCoinName(value: string): void {
    jspb.Message.setField(this, 2, value);
  }

  getRawTx(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 3, "") as Uint8Array | string;
  }
  getRawTx_asU8(): Uint8Array {
    const val = this.getRawTx();
    if (val instanceof Uint8Array) return val;
    return jspb.Message.bytesAsU8(val as string);
  }
  getRawTx_asB64(): string {
    const val = this.getRawTx();
    if (typeof val === "string") return val;
    return jspb.Message.bytesAsB64(val as Uint8Array);
  }
  setRawTx(value: Uint8Array | string): void {
    jspb.Message.setField(this, 3, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    SolanaSignTx.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(_includeInstance?: boolean): SolanaSignTx.AsObject {
    return {
      addressNList: this.getAddressNList(),
      coinName: this.getCoinName(),
      rawTx: this.getRawTx(),
    };
  }

  static toObject(_includeInstance: boolean, msg: SolanaSignTx): SolanaSignTx.AsObject {
    return msg.toObject(_includeInstance);
  }

  static deserializeBinary(bytes: Uint8Array): SolanaSignTx {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new SolanaSignTx();
    return SolanaSignTx.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: SolanaSignTx, reader: jspb.BinaryReader): SolanaSignTx {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      const field = reader.getFieldNumber();
      switch (field) {
        case 1: {
          const values = reader.isDelimited() ? reader.readPackedUint32() : [reader.readUint32()];
          for (const v of values) msg.addAddressN(v);
          break;
        }
        case 2:
          msg.setCoinName(reader.readString());
          break;
        case 3:
          msg.setRawTx(reader.readBytes());
          break;
        default:
          reader.skipField();
          break;
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: SolanaSignTx, writer: jspb.BinaryWriter): void {
    const addressN = message.getAddressNList();
    if (addressN.length > 0) {
      writer.writeRepeatedUint32(1, addressN);
    }
    const coinName = jspb.Message.getField(message, 2) as string | null;
    if (coinName != null) {
      writer.writeString(2, coinName);
    }
    const rawTx = message.getRawTx_asU8();
    if (rawTx.length > 0) {
      writer.writeBytes(3, rawTx);
    }
  }
}

export namespace SolanaSignTx {
  export type AsObject = {
    addressNList: number[];
    coinName?: string;
    rawTx: Uint8Array | string;
  };
}

/**
 * SolanaSignedTx: signature(1, bytes)
 */
export class SolanaSignedTx extends jspb.Message {
  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, null, null);
  }

  getSignature(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 1, "") as Uint8Array | string;
  }
  getSignature_asU8(): Uint8Array {
    const val = this.getSignature();
    if (val instanceof Uint8Array) return val;
    return jspb.Message.bytesAsU8(val as string);
  }
  getSignature_asB64(): string {
    const val = this.getSignature();
    if (typeof val === "string") return val;
    return jspb.Message.bytesAsB64(val as Uint8Array);
  }
  setSignature(value: Uint8Array | string): void {
    jspb.Message.setField(this, 1, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    SolanaSignedTx.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(_includeInstance?: boolean): SolanaSignedTx.AsObject {
    return { signature: this.getSignature() };
  }

  static toObject(_includeInstance: boolean, msg: SolanaSignedTx): SolanaSignedTx.AsObject {
    return msg.toObject(_includeInstance);
  }

  static deserializeBinary(bytes: Uint8Array): SolanaSignedTx {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new SolanaSignedTx();
    return SolanaSignedTx.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: SolanaSignedTx, reader: jspb.BinaryReader): SolanaSignedTx {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      const field = reader.getFieldNumber();
      switch (field) {
        case 1:
          msg.setSignature(reader.readBytes());
          break;
        default:
          reader.skipField();
          break;
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: SolanaSignedTx, writer: jspb.BinaryWriter): void {
    const sig = message.getSignature_asU8();
    if (sig.length > 0) {
      writer.writeBytes(1, sig);
    }
  }
}

export namespace SolanaSignedTx {
  export type AsObject = {
    signature: Uint8Array | string;
  };
}

/**
 * SolanaSignMessage: address_n(1, repeated uint32), coin_name(2, string),
 *                    message(3, bytes), show_display(4, bool)
 *
 * Firmware message type 754. Signs arbitrary message bytes with Ed25519.
 */
export class SolanaSignMessage extends jspb.Message {
  static repeatedFields_ = [1];

  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, SolanaSignMessage.repeatedFields_, null);
  }

  getAddressNList(): number[] {
    return Msg.getRepeatedField(this, 1) as number[];
  }
  setAddressNList(value: number[]): void {
    jspb.Message.setField(this, 1, value || []);
  }
  addAddressN(value: number): void {
    jspb.Message.addToRepeatedField(this, 1, value);
  }

  getCoinName(): string | undefined {
    return jspb.Message.getFieldWithDefault(this, 2, "Solana") as string;
  }
  setCoinName(value: string): void {
    jspb.Message.setField(this, 2, value);
  }

  getMessage(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 3, "") as Uint8Array | string;
  }
  getMessage_asU8(): Uint8Array {
    const val = this.getMessage();
    if (val instanceof Uint8Array) return val;
    return jspb.Message.bytesAsU8(val as string);
  }
  setMessage(value: Uint8Array | string): void {
    jspb.Message.setField(this, 3, value);
  }

  getShowDisplay(): boolean | undefined {
    const f = jspb.Message.getField(this, 4);
    return f == null ? true : !!f;
  }
  setShowDisplay(value: boolean): void {
    jspb.Message.setField(this, 4, value ? 1 : 0);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    SolanaSignMessage.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(_includeInstance?: boolean): SolanaSignMessage.AsObject {
    return {
      addressNList: this.getAddressNList(),
      coinName: this.getCoinName(),
      message: this.getMessage(),
      showDisplay: this.getShowDisplay(),
    };
  }

  static toObject(_includeInstance: boolean, msg: SolanaSignMessage): SolanaSignMessage.AsObject {
    return msg.toObject(_includeInstance);
  }

  static deserializeBinary(bytes: Uint8Array): SolanaSignMessage {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new SolanaSignMessage();
    return SolanaSignMessage.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: SolanaSignMessage, reader: jspb.BinaryReader): SolanaSignMessage {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      const field = reader.getFieldNumber();
      switch (field) {
        case 1: {
          const values = reader.isDelimited() ? reader.readPackedUint32() : [reader.readUint32()];
          for (const v of values) msg.addAddressN(v);
          break;
        }
        case 2:
          msg.setCoinName(reader.readString());
          break;
        case 3:
          msg.setMessage(reader.readBytes());
          break;
        case 4:
          msg.setShowDisplay(reader.readBool());
          break;
        default:
          reader.skipField();
          break;
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: SolanaSignMessage, writer: jspb.BinaryWriter): void {
    const addressN = message.getAddressNList();
    if (addressN.length > 0) {
      writer.writeRepeatedUint32(1, addressN);
    }
    const coinName = jspb.Message.getField(message, 2) as string | null;
    if (coinName != null) {
      writer.writeString(2, coinName);
    }
    const msgBytes = message.getMessage_asU8();
    if (msgBytes.length > 0) {
      writer.writeBytes(3, msgBytes);
    }
    const showDisplay = jspb.Message.getField(message, 4);
    if (showDisplay != null) {
      writer.writeBool(4, !!showDisplay);
    }
  }
}

export namespace SolanaSignMessage {
  export type AsObject = {
    addressNList: number[];
    coinName?: string;
    message: Uint8Array | string;
    showDisplay?: boolean;
  };
}

/**
 * SolanaMessageSignature: public_key(1, bytes), signature(2, bytes)
 *
 * Firmware message type 755. Response to SolanaSignMessage.
 */
export class SolanaMessageSignature extends jspb.Message {
  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, null, null);
  }

  getPublicKey(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 1, "") as Uint8Array | string;
  }
  getPublicKey_asU8(): Uint8Array {
    const val = this.getPublicKey();
    if (val instanceof Uint8Array) return val;
    return jspb.Message.bytesAsU8(val as string);
  }
  setPublicKey(value: Uint8Array | string): void {
    jspb.Message.setField(this, 1, value);
  }

  getSignature(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 2, "") as Uint8Array | string;
  }
  getSignature_asU8(): Uint8Array {
    const val = this.getSignature();
    if (val instanceof Uint8Array) return val;
    return jspb.Message.bytesAsU8(val as string);
  }
  setSignature(value: Uint8Array | string): void {
    jspb.Message.setField(this, 2, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    SolanaMessageSignature.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(_includeInstance?: boolean): SolanaMessageSignature.AsObject {
    return {
      publicKey: this.getPublicKey(),
      signature: this.getSignature(),
    };
  }

  static toObject(_includeInstance: boolean, msg: SolanaMessageSignature): SolanaMessageSignature.AsObject {
    return msg.toObject(_includeInstance);
  }

  static deserializeBinary(bytes: Uint8Array): SolanaMessageSignature {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new SolanaMessageSignature();
    return SolanaMessageSignature.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: SolanaMessageSignature, reader: jspb.BinaryReader): SolanaMessageSignature {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      const field = reader.getFieldNumber();
      switch (field) {
        case 1:
          msg.setPublicKey(reader.readBytes());
          break;
        case 2:
          msg.setSignature(reader.readBytes());
          break;
        default:
          reader.skipField();
          break;
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: SolanaMessageSignature, writer: jspb.BinaryWriter): void {
    const publicKey = message.getPublicKey_asU8();
    if (publicKey.length > 0) {
      writer.writeBytes(1, publicKey);
    }
    const sig = message.getSignature_asU8();
    if (sig.length > 0) {
      writer.writeBytes(2, sig);
    }
  }
}

export namespace SolanaMessageSignature {
  export type AsObject = {
    publicKey: Uint8Array | string;
    signature: Uint8Array | string;
  };
}

// ── Runtime Registration ──────────────────────────────────────────────
// Inject Solana message types into the KeepKey transport registries.
// This allows transport.call() / fromMessageBuffer() to encode/decode them.

function registerSolanaMessages() {
  // Add message type enum values to Messages.MessageType
  const mt = Messages.MessageType as unknown as Record<string, number>;
  mt["MESSAGETYPE_SOLANAGETADDRESS"] = MESSAGETYPE_SOLANAGETADDRESS;
  mt["MESSAGETYPE_SOLANAADDRESS"] = MESSAGETYPE_SOLANAADDRESS;
  mt["MESSAGETYPE_SOLANASIGNTX"] = MESSAGETYPE_SOLANASIGNTX;
  mt["MESSAGETYPE_SOLANASIGNEDTX"] = MESSAGETYPE_SOLANASIGNEDTX;
  mt["MESSAGETYPE_SOLANASIGNMESSAGE"] = MESSAGETYPE_SOLANASIGNMESSAGE;
  mt["MESSAGETYPE_SOLANAMESSAGESIGNATURE"] = MESSAGETYPE_SOLANAMESSAGESIGNATURE;

  // Register name lookup (for readResponse event emitting)
  messageNameRegistry[MESSAGETYPE_SOLANAGETADDRESS] = "SolanaGetAddress";
  messageNameRegistry[MESSAGETYPE_SOLANAADDRESS] = "SolanaAddress";
  messageNameRegistry[MESSAGETYPE_SOLANASIGNTX] = "SolanaSignTx";
  messageNameRegistry[MESSAGETYPE_SOLANASIGNEDTX] = "SolanaSignedTx";
  messageNameRegistry[MESSAGETYPE_SOLANASIGNMESSAGE] = "SolanaSignMessage";
  messageNameRegistry[MESSAGETYPE_SOLANAMESSAGESIGNATURE] = "SolanaMessageSignature";

  // Register protobuf constructors (for fromMessageBuffer deserialization)
  messageTypeRegistry[MESSAGETYPE_SOLANAGETADDRESS] = SolanaGetAddress as any;
  messageTypeRegistry[MESSAGETYPE_SOLANAADDRESS] = SolanaAddress as any;
  messageTypeRegistry[MESSAGETYPE_SOLANASIGNTX] = SolanaSignTx as any;
  messageTypeRegistry[MESSAGETYPE_SOLANASIGNEDTX] = SolanaSignedTx as any;
  messageTypeRegistry[MESSAGETYPE_SOLANASIGNMESSAGE] = SolanaSignMessage as any;
  messageTypeRegistry[MESSAGETYPE_SOLANAMESSAGESIGNATURE] = SolanaMessageSignature as any;
}

// Register on module load
registerSolanaMessages();

// ── Wallet Methods ──────────────────────────────────────────────────

// Solana derivation: m/44'/501'/account'/0'  (4 hardened components, Ed25519)
export function solanaGetAccountPaths(msg: core.SolanaGetAccountPaths): Array<core.SolanaAccountPath> {
  return [
    {
      addressNList: [
        0x80000000 + 44,
        0x80000000 + core.slip44ByCoin("Solana"),
        0x80000000 + msg.accountIdx,
        0x80000000 + 0,
      ],
    },
  ];
}

export async function solanaGetAddress(transport: Transport, msg: core.SolanaGetAddress): Promise<string> {
  const getAddr = new SolanaGetAddress();
  getAddr.setAddressNList(msg.addressNList);
  getAddr.setShowDisplay(msg.showDisplay !== false);
  const response = await transport.call(MESSAGETYPE_SOLANAGETADDRESS, getAddr, {
    msgTimeout: core.LONG_TIMEOUT,
  });

  const solanaAddress = response.proto as SolanaAddress;
  return core.mustBeDefined(solanaAddress.getAddress());
}

export async function solanaSignTx(transport: Transport, msg: core.SolanaSignTx): Promise<core.SolanaSignedTx> {
  return transport.lockDuring(async () => {
    const signTx = new SolanaSignTx();
    signTx.setAddressNList(msg.addressNList);

    // Accept rawTx as Uint8Array, Buffer, hex string, or base64 string
    let rawBytes: Uint8Array;
    if (msg.rawTx instanceof Uint8Array) {
      rawBytes = msg.rawTx;
    } else if (typeof msg.rawTx === "string") {
      // Try hex first, then base64
      if (/^[0-9a-fA-F]+$/.test(msg.rawTx)) {
        rawBytes = core.fromHexString(msg.rawTx);
      } else {
        rawBytes = Uint8Array.from(Buffer.from(msg.rawTx, "base64"));
      }
    } else {
      rawBytes = new Uint8Array(msg.rawTx as any);
    }
    signTx.setRawTx(rawBytes);

    const resp = await transport.call(MESSAGETYPE_SOLANASIGNTX, signTx, {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });

    if (resp.message_enum !== MESSAGETYPE_SOLANASIGNEDTX) {
      throw new Error(`solana: unexpected response ${resp.message_type}`);
    }

    const signedTx = resp.proto as SolanaSignedTx;
    return {
      signature: signedTx.getSignature_asU8(),
    };
  });
}

/**
 * Sign an arbitrary message using firmware message type 754 (SolanaSignMessage).
 *
 * Unlike solanaSignTx (type 752) which parses raw_tx as a Solana transaction,
 * this sends the bytes through SolanaSignMessage which signs raw bytes directly
 * via Ed25519 without parsing — matching v10 behavior.
 */
export async function solanaSignMessage(
  transport: Transport,
  msg: { addressNList: number[]; message: Uint8Array | string; showDisplay?: boolean },
): Promise<{ publicKey: Uint8Array; signature: Uint8Array }> {
  return transport.lockDuring(async () => {
    const signMsg = new SolanaSignMessage();
    signMsg.setAddressNList(msg.addressNList);

    // Accept message as Uint8Array, Buffer, hex string, or base64 string
    let msgBytes: Uint8Array;
    if (msg.message instanceof Uint8Array) {
      msgBytes = msg.message;
    } else if (typeof msg.message === "string") {
      if (/^[0-9a-fA-F]+$/.test(msg.message)) {
        msgBytes = core.fromHexString(msg.message);
      } else {
        msgBytes = Uint8Array.from(Buffer.from(msg.message, "base64"));
      }
    } else {
      msgBytes = new Uint8Array(msg.message as any);
    }
    signMsg.setMessage(msgBytes);
    signMsg.setShowDisplay(msg.showDisplay !== false);

    const resp = await transport.call(MESSAGETYPE_SOLANASIGNMESSAGE, signMsg, {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });

    if (resp.message_enum !== MESSAGETYPE_SOLANAMESSAGESIGNATURE) {
      throw new Error(`solana: unexpected response ${resp.message_type}`);
    }

    const msgSig = resp.proto as SolanaMessageSignature;
    return {
      publicKey: msgSig.getPublicKey_asU8(),
      signature: msgSig.getSignature_asU8(),
    };
  });
}

import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as core from "@keepkey/hdwallet-core";
import * as jspb from "google-protobuf";

import { Transport } from "./transport";
import { messageNameRegistry, messageTypeRegistry } from "./typeRegistry";

// Cast to access methods that exist at runtime but not in @types/google-protobuf
const Msg = jspb.Message as any;

// ── Tron Message Type IDs (from firmware messages.proto) ─────────────────
const MESSAGETYPE_TRONGETADDRESS = 1400;
const MESSAGETYPE_TRONADDRESS = 1401;
const MESSAGETYPE_TRONSIGNTX = 1402;
const MESSAGETYPE_TRONSIGNEDTX = 1403;
const MESSAGETYPE_TRONSIGNMESSAGE = 1404;
const MESSAGETYPE_TRONMESSAGESIGNATURE = 1405;
const MESSAGETYPE_TRONVERIFYMESSAGE = 1406;
const MESSAGETYPE_TRONSIGNTYPEDHASH = 1407;
const MESSAGETYPE_TRONTYPEDDATASIGNATURE = 1408;
const MESSAGETYPE_SUCCESS = 2;

// ── Protobuf Shims ──────────────────────────────────────────────────
// Hand-rolled jspb.Message subclasses matching firmware Tron protobuf.
// These are wire-compatible with the firmware's protobuf encoding.

/**
 * TronGetAddress: address_n(1, repeated uint32), coin_name(2, string), show_display(3, bool)
 */
export class TronGetAddress extends jspb.Message {
  static repeatedFields_ = [1];

  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, TronGetAddress.repeatedFields_, null);
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
    return jspb.Message.getFieldWithDefault(this, 2, "Tron") as string;
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
    TronGetAddress.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(_includeInstance?: boolean): TronGetAddress.AsObject {
    return {
      addressNList: this.getAddressNList(),
      coinName: this.getCoinName(),
      showDisplay: this.getShowDisplay(),
    };
  }

  static toObject(_includeInstance: boolean, msg: TronGetAddress): TronGetAddress.AsObject {
    return msg.toObject(_includeInstance);
  }

  static deserializeBinary(bytes: Uint8Array): TronGetAddress {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new TronGetAddress();
    return TronGetAddress.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: TronGetAddress, reader: jspb.BinaryReader): TronGetAddress {
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

  static serializeBinaryToWriter(message: TronGetAddress, writer: jspb.BinaryWriter): void {
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

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TronGetAddress {
  export type AsObject = {
    addressNList: number[];
    coinName?: string;
    showDisplay?: boolean;
  };
}

/**
 * TronAddress: address(1, string)
 */
export class TronAddress extends jspb.Message {
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
    TronAddress.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(_includeInstance?: boolean): TronAddress.AsObject {
    return { address: this.getAddress() };
  }

  static toObject(_includeInstance: boolean, msg: TronAddress): TronAddress.AsObject {
    return msg.toObject(_includeInstance);
  }

  static deserializeBinary(bytes: Uint8Array): TronAddress {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new TronAddress();
    return TronAddress.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: TronAddress, reader: jspb.BinaryReader): TronAddress {
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

  static serializeBinaryToWriter(message: TronAddress, writer: jspb.BinaryWriter): void {
    const address = jspb.Message.getField(message, 1) as string | null;
    if (address != null) {
      writer.writeString(1, address);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TronAddress {
  export type AsObject = {
    address?: string;
  };
}

/**
 * TronTransferContract: sub-message for field 10 of TronSignTx.
 * Enables clear-signing on device (firmware shows "Send X TRX to address").
 *
 * Proto: to_address(1, string), amount(2, uint64)
 */
export class TronTransferContract extends jspb.Message {
  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, null, null);
  }
  getToAddress(): string {
    return jspb.Message.getFieldWithDefault(this, 1, "") as string;
  }
  setToAddress(value: string): void {
    jspb.Message.setField(this, 1, value);
  }
  getAmount(): number {
    return Number(jspb.Message.getFieldWithDefault(this, 2, 0));
  }
  setAmount(value: number): void {
    jspb.Message.setField(this, 2, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    TronTransferContract.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }
  toObject(_includeInstance?: boolean): { toAddress: string; amount: number } {
    return { toAddress: this.getToAddress(), amount: this.getAmount() };
  }
  static serializeBinaryToWriter(msg: TronTransferContract, writer: jspb.BinaryWriter): void {
    const to = jspb.Message.getField(msg, 1) as string | null;
    if (to) writer.writeString(1, to);
    const amt = jspb.Message.getField(msg, 2);
    if (amt != null) writer.writeUint64(2, Number(amt));
  }
}

/**
 * TronSignTx: address_n(1), coin_name(2), raw_data(3, bytes),
 *             ref_block_bytes(4, bytes), ref_block_hash(5, bytes),
 *             expiration(6, uint64), contract_type(7, string),
 *             to_address(8, string), amount(9, uint64),
 *             transfer(10, TronTransferContract), trigger_smart(11, ...),
 *             fee_limit(12, uint64), timestamp(13, uint64), data(14, bytes)
 */
export class TronSignTx extends jspb.Message {
  static repeatedFields_ = [1];

  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, TronSignTx.repeatedFields_, null);
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
    return jspb.Message.getFieldWithDefault(this, 2, "Tron") as string;
  }
  setCoinName(value: string): void {
    jspb.Message.setField(this, 2, value);
  }

  getRawData(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 3, "") as Uint8Array | string;
  }
  getRawData_asU8(): Uint8Array {
    const val = this.getRawData();
    if (val instanceof Uint8Array) return val;
    return jspb.Message.bytesAsU8(val as string);
  }
  setRawData(value: Uint8Array | string): void {
    jspb.Message.setField(this, 3, value);
  }

  // Field 4: ref_block_bytes (2 bytes from block reference)
  setRefBlockBytes(value: Uint8Array | string): void {
    jspb.Message.setField(this, 4, value);
  }
  // Field 5: ref_block_hash (8 bytes from block hash)
  setRefBlockHash(value: Uint8Array | string): void {
    jspb.Message.setField(this, 5, value);
  }
  // Field 6: expiration (uint64 ms timestamp)
  setExpiration(value: number): void {
    jspb.Message.setField(this, 6, value);
  }

  getToAddress(): string | undefined {
    return jspb.Message.getFieldWithDefault(this, 8, "") as string;
  }
  setToAddress(value: string): void {
    jspb.Message.setField(this, 8, value);
  }

  getAmount(): number | undefined {
    const f = jspb.Message.getField(this, 9);
    return f == null ? undefined : Number(f);
  }
  setAmount(value: number): void {
    jspb.Message.setField(this, 9, value);
  }

  // Field 10: transfer (TronTransferContract sub-message — enables clear-signing)
  setTransfer(value: TronTransferContract): void {
    jspb.Message.setWrapperField(this, 10, value);
  }
  // Field 12: fee_limit (uint64)
  setFeeLimit(value: number): void {
    jspb.Message.setField(this, 12, value);
  }
  // Field 13: timestamp (uint64 ms)
  setTimestamp(value: number): void {
    jspb.Message.setField(this, 13, value);
  }
  // Field 14: data/memo (bytes)
  setData(value: Uint8Array | string): void {
    jspb.Message.setField(this, 14, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    TronSignTx.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(_includeInstance?: boolean): TronSignTx.AsObject {
    return {
      addressNList: this.getAddressNList(),
      coinName: this.getCoinName(),
      rawTx: this.getRawData(),
    };
  }

  static toObject(_includeInstance: boolean, msg: TronSignTx): TronSignTx.AsObject {
    return msg.toObject(_includeInstance);
  }

  static deserializeBinary(bytes: Uint8Array): TronSignTx {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new TronSignTx();
    return TronSignTx.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: TronSignTx, reader: jspb.BinaryReader): TronSignTx {
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
          msg.setRawData(reader.readBytes());
          break;
        case 8:
          msg.setToAddress(reader.readString());
          break;
        case 9:
          msg.setAmount(reader.readUint64());
          break;
        default:
          reader.skipField();
          break;
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: TronSignTx, writer: jspb.BinaryWriter): void {
    const addressN = message.getAddressNList();
    if (addressN.length > 0) writer.writeRepeatedUint32(1, addressN);
    const coinName = jspb.Message.getField(message, 2) as string | null;
    if (coinName != null) writer.writeString(2, coinName);
    const rawData = message.getRawData_asU8();
    if (rawData.length > 0) writer.writeBytes(3, rawData);
    // Field 4: ref_block_bytes
    const refBlockBytes = jspb.Message.getField(message, 4);
    if (refBlockBytes != null) writer.writeBytes(4, refBlockBytes as Uint8Array | string);
    // Field 5: ref_block_hash
    const refBlockHash = jspb.Message.getField(message, 5);
    if (refBlockHash != null) writer.writeBytes(5, refBlockHash as Uint8Array | string);
    // Field 6: expiration
    const expiration = jspb.Message.getField(message, 6);
    if (expiration != null) writer.writeUint64(6, Number(expiration));
    // Field 8: to_address (legacy, kept for backwards compat)
    const toAddress = jspb.Message.getField(message, 8) as string | null;
    if (toAddress != null && toAddress !== "") writer.writeString(8, toAddress);
    // Field 9: amount (legacy)
    const amount = jspb.Message.getField(message, 9);
    if (amount != null) writer.writeUint64(9, Number(amount));
    // Field 10: transfer (sub-message) — must use getWrapperField, not getField
    const transfer = jspb.Message.getWrapperField(message, TronTransferContract, 10) as TronTransferContract | null;
    if (transfer != null) writer.writeMessage(10, transfer, TronTransferContract.serializeBinaryToWriter);
    // Field 12: fee_limit
    const feeLimit = jspb.Message.getField(message, 12);
    if (feeLimit != null) writer.writeUint64(12, Number(feeLimit));
    // Field 13: timestamp
    const timestamp = jspb.Message.getField(message, 13);
    if (timestamp != null) writer.writeUint64(13, Number(timestamp));
    // Field 14: data/memo
    const data = jspb.Message.getField(message, 14);
    if (data != null) writer.writeBytes(14, data as Uint8Array | string);
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TronSignTx {
  export type AsObject = {
    addressNList: number[];
    coinName?: string;
    rawTx: Uint8Array | string;
  };
}

/**
 * TronSignedTx: signature(1, bytes)
 */
export class TronSignedTx extends jspb.Message {
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
    TronSignedTx.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(_includeInstance?: boolean): TronSignedTx.AsObject {
    return { signature: this.getSignature() };
  }

  static toObject(_includeInstance: boolean, msg: TronSignedTx): TronSignedTx.AsObject {
    return msg.toObject(_includeInstance);
  }

  static deserializeBinary(bytes: Uint8Array): TronSignedTx {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new TronSignedTx();
    return TronSignedTx.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: TronSignedTx, reader: jspb.BinaryReader): TronSignedTx {
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

  static serializeBinaryToWriter(message: TronSignedTx, writer: jspb.BinaryWriter): void {
    const sig = message.getSignature_asU8();
    if (sig.length > 0) {
      writer.writeBytes(1, sig);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TronSignedTx {
  export type AsObject = {
    signature: Uint8Array | string;
  };
}

/**
 * TronSignMessage: address_n(1, repeated uint32), coin_name(2, string), message(3, bytes), show_display(4, bool)
 *
 * TIP-191 personal_sign request:
 *   keccak256("\x19TRON Signed Message:\n" + ASCII(len) + message)
 *   secp256k1_sign(digest) → 65 bytes (r || s || 27+v)
 */
export class TronSignMessage extends jspb.Message {
  static repeatedFields_ = [1];

  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, TronSignMessage.repeatedFields_, null);
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
    return jspb.Message.getFieldWithDefault(this, 2, "Tron") as string;
  }
  setCoinName(value: string): void {
    jspb.Message.setField(this, 2, value);
  }

  getMessage(): Uint8Array | undefined {
    const f = jspb.Message.getField(this, 3) as Uint8Array | string | null;
    if (f == null) return undefined;
    return typeof f === "string" ? Uint8Array.from(Buffer.from(f, "base64")) : f;
  }
  setMessage(value: Uint8Array): void {
    jspb.Message.setField(this, 3, value);
  }

  getShowDisplay(): boolean | undefined {
    const f = jspb.Message.getField(this, 4);
    return f == null ? undefined : !!f;
  }
  setShowDisplay(value: boolean): void {
    jspb.Message.setField(this, 4, value ? 1 : 0);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    TronSignMessage.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(_includeInstance?: boolean): TronSignMessage.AsObject {
    return {
      addressNList: this.getAddressNList(),
      coinName: this.getCoinName(),
      message: this.getMessage(),
      showDisplay: this.getShowDisplay(),
    };
  }

  static toObject(_includeInstance: boolean, msg: TronSignMessage): TronSignMessage.AsObject {
    return msg.toObject(_includeInstance);
  }

  static deserializeBinary(bytes: Uint8Array): TronSignMessage {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new TronSignMessage();
    return TronSignMessage.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: TronSignMessage, reader: jspb.BinaryReader): TronSignMessage {
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
          msg.setMessage(reader.readBytes() as Uint8Array);
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

  static serializeBinaryToWriter(message: TronSignMessage, writer: jspb.BinaryWriter): void {
    const addressN = message.getAddressNList();
    if (addressN.length > 0) {
      writer.writeRepeatedUint32(1, addressN);
    }
    const coinName = jspb.Message.getField(message, 2) as string | null;
    if (coinName != null) {
      writer.writeString(2, coinName);
    }
    const messageBytes = jspb.Message.getField(message, 3) as Uint8Array | null;
    if (messageBytes != null) {
      writer.writeBytes(3, messageBytes);
    }
    const showDisplay = jspb.Message.getField(message, 4);
    if (showDisplay != null) {
      writer.writeBool(4, !!showDisplay);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TronSignMessage {
  export type AsObject = {
    addressNList: number[];
    coinName?: string;
    message?: Uint8Array;
    showDisplay?: boolean;
  };
}

/**
 * TronMessageSignature: address(1, string Base58Check), signature(2, bytes)
 */
export class TronMessageSignature extends jspb.Message {
  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, [], null);
  }

  getAddress(): string | undefined {
    const f = jspb.Message.getField(this, 1);
    return f == null ? undefined : (f as string);
  }
  setAddress(value: string): void {
    jspb.Message.setField(this, 1, value);
  }

  getSignature(): Uint8Array | undefined {
    const f = jspb.Message.getField(this, 2) as Uint8Array | string | null;
    if (f == null) return undefined;
    return typeof f === "string" ? Uint8Array.from(Buffer.from(f, "base64")) : f;
  }
  setSignature(value: Uint8Array): void {
    jspb.Message.setField(this, 2, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    TronMessageSignature.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(_includeInstance?: boolean): TronMessageSignature.AsObject {
    return {
      address: this.getAddress(),
      signature: this.getSignature(),
    };
  }

  static toObject(_includeInstance: boolean, msg: TronMessageSignature): TronMessageSignature.AsObject {
    return msg.toObject(_includeInstance);
  }

  static deserializeBinary(bytes: Uint8Array): TronMessageSignature {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new TronMessageSignature();
    return TronMessageSignature.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: TronMessageSignature, reader: jspb.BinaryReader): TronMessageSignature {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      const field = reader.getFieldNumber();
      switch (field) {
        case 1:
          msg.setAddress(reader.readString());
          break;
        case 2:
          msg.setSignature(reader.readBytes() as Uint8Array);
          break;
        default:
          reader.skipField();
          break;
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: TronMessageSignature, writer: jspb.BinaryWriter): void {
    const address = jspb.Message.getField(message, 1) as string | null;
    if (address != null) {
      writer.writeString(1, address);
    }
    const sig = jspb.Message.getField(message, 2) as Uint8Array | null;
    if (sig != null) {
      writer.writeBytes(2, sig);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TronMessageSignature {
  export type AsObject = {
    address?: string;
    signature?: Uint8Array;
  };
}

/**
 * TronVerifyMessage: address(1, string), signature(2, bytes), message(3, bytes)
 */
export class TronVerifyMessage extends jspb.Message {
  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, [], null);
  }

  getAddress(): string | undefined {
    const f = jspb.Message.getField(this, 1);
    return f == null ? undefined : (f as string);
  }
  setAddress(value: string): void {
    jspb.Message.setField(this, 1, value);
  }

  getSignature(): Uint8Array | undefined {
    const f = jspb.Message.getField(this, 2) as Uint8Array | string | null;
    if (f == null) return undefined;
    return typeof f === "string" ? Uint8Array.from(Buffer.from(f, "base64")) : f;
  }
  setSignature(value: Uint8Array): void {
    jspb.Message.setField(this, 2, value);
  }

  getMessage(): Uint8Array | undefined {
    const f = jspb.Message.getField(this, 3) as Uint8Array | string | null;
    if (f == null) return undefined;
    return typeof f === "string" ? Uint8Array.from(Buffer.from(f, "base64")) : f;
  }
  setMessage(value: Uint8Array): void {
    jspb.Message.setField(this, 3, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    TronVerifyMessage.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(_includeInstance?: boolean): TronVerifyMessage.AsObject {
    return {
      address: this.getAddress(),
      signature: this.getSignature(),
      message: this.getMessage(),
    };
  }

  static toObject(_includeInstance: boolean, msg: TronVerifyMessage): TronVerifyMessage.AsObject {
    return msg.toObject(_includeInstance);
  }

  static deserializeBinary(bytes: Uint8Array): TronVerifyMessage {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new TronVerifyMessage();
    return TronVerifyMessage.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: TronVerifyMessage, reader: jspb.BinaryReader): TronVerifyMessage {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      const field = reader.getFieldNumber();
      switch (field) {
        case 1:
          msg.setAddress(reader.readString());
          break;
        case 2:
          msg.setSignature(reader.readBytes() as Uint8Array);
          break;
        case 3:
          msg.setMessage(reader.readBytes() as Uint8Array);
          break;
        default:
          reader.skipField();
          break;
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: TronVerifyMessage, writer: jspb.BinaryWriter): void {
    const address = jspb.Message.getField(message, 1) as string | null;
    if (address != null) {
      writer.writeString(1, address);
    }
    const sig = jspb.Message.getField(message, 2) as Uint8Array | null;
    if (sig != null) {
      writer.writeBytes(2, sig);
    }
    const messageBytes = jspb.Message.getField(message, 3) as Uint8Array | null;
    if (messageBytes != null) {
      writer.writeBytes(3, messageBytes);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TronVerifyMessage {
  export type AsObject = {
    address?: string;
    signature?: Uint8Array;
    message?: Uint8Array;
  };
}

/**
 * TronSignTypedHash: address_n(1, repeated uint32), coin_name(2, string),
 *                   domain_separator_hash(3, bytes), message_hash(4, bytes)
 *
 * TIP-712 typed-data hash mode. Host pre-computes the domainSeparator + message
 * hashes per the TIP-712 spec; device assembles
 *   keccak256("\x19\x01" || domain_separator_hash || message_hash)
 * and signs with secp256k1 (recoverable, 65 bytes).
 */
export class TronSignTypedHash extends jspb.Message {
  static repeatedFields_ = [1];

  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, TronSignTypedHash.repeatedFields_, null);
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
    return jspb.Message.getFieldWithDefault(this, 2, "Tron") as string;
  }
  setCoinName(value: string): void {
    jspb.Message.setField(this, 2, value);
  }

  getDomainSeparatorHash(): Uint8Array | undefined {
    const f = jspb.Message.getField(this, 3) as Uint8Array | string | null;
    if (f == null) return undefined;
    return typeof f === "string" ? Uint8Array.from(Buffer.from(f, "base64")) : f;
  }
  setDomainSeparatorHash(value: Uint8Array): void {
    jspb.Message.setField(this, 3, value);
  }

  getMessageHash(): Uint8Array | undefined {
    const f = jspb.Message.getField(this, 4) as Uint8Array | string | null;
    if (f == null) return undefined;
    return typeof f === "string" ? Uint8Array.from(Buffer.from(f, "base64")) : f;
  }
  setMessageHash(value: Uint8Array): void {
    jspb.Message.setField(this, 4, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    TronSignTypedHash.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(_includeInstance?: boolean): TronSignTypedHash.AsObject {
    return {
      addressNList: this.getAddressNList(),
      coinName: this.getCoinName(),
      domainSeparatorHash: this.getDomainSeparatorHash(),
      messageHash: this.getMessageHash(),
    };
  }

  static toObject(_includeInstance: boolean, msg: TronSignTypedHash): TronSignTypedHash.AsObject {
    return msg.toObject(_includeInstance);
  }

  static deserializeBinary(bytes: Uint8Array): TronSignTypedHash {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new TronSignTypedHash();
    return TronSignTypedHash.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: TronSignTypedHash, reader: jspb.BinaryReader): TronSignTypedHash {
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
          msg.setDomainSeparatorHash(reader.readBytes() as Uint8Array);
          break;
        case 4:
          msg.setMessageHash(reader.readBytes() as Uint8Array);
          break;
        default:
          reader.skipField();
          break;
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: TronSignTypedHash, writer: jspb.BinaryWriter): void {
    const addressN = message.getAddressNList();
    if (addressN.length > 0) {
      writer.writeRepeatedUint32(1, addressN);
    }
    const coinName = jspb.Message.getField(message, 2) as string | null;
    if (coinName != null) {
      writer.writeString(2, coinName);
    }
    const dsHash = jspb.Message.getField(message, 3) as Uint8Array | null;
    if (dsHash != null) {
      writer.writeBytes(3, dsHash);
    }
    const msgHash = jspb.Message.getField(message, 4) as Uint8Array | null;
    if (msgHash != null) {
      writer.writeBytes(4, msgHash);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TronSignTypedHash {
  export type AsObject = {
    addressNList: number[];
    coinName?: string;
    domainSeparatorHash?: Uint8Array;
    messageHash?: Uint8Array;
  };
}

/**
 * TronTypedDataSignature: address(1, string), signature(2, bytes)
 */
export class TronTypedDataSignature extends jspb.Message {
  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, [], null);
  }

  getAddress(): string | undefined {
    const f = jspb.Message.getField(this, 1);
    return f == null ? undefined : (f as string);
  }
  setAddress(value: string): void {
    jspb.Message.setField(this, 1, value);
  }

  getSignature(): Uint8Array | undefined {
    const f = jspb.Message.getField(this, 2) as Uint8Array | string | null;
    if (f == null) return undefined;
    return typeof f === "string" ? Uint8Array.from(Buffer.from(f, "base64")) : f;
  }
  setSignature(value: Uint8Array): void {
    jspb.Message.setField(this, 2, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    TronTypedDataSignature.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(_includeInstance?: boolean): TronTypedDataSignature.AsObject {
    return {
      address: this.getAddress(),
      signature: this.getSignature(),
    };
  }

  static toObject(_includeInstance: boolean, msg: TronTypedDataSignature): TronTypedDataSignature.AsObject {
    return msg.toObject(_includeInstance);
  }

  static deserializeBinary(bytes: Uint8Array): TronTypedDataSignature {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new TronTypedDataSignature();
    return TronTypedDataSignature.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: TronTypedDataSignature, reader: jspb.BinaryReader): TronTypedDataSignature {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      const field = reader.getFieldNumber();
      switch (field) {
        case 1:
          msg.setAddress(reader.readString());
          break;
        case 2:
          msg.setSignature(reader.readBytes() as Uint8Array);
          break;
        default:
          reader.skipField();
          break;
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: TronTypedDataSignature, writer: jspb.BinaryWriter): void {
    const address = jspb.Message.getField(message, 1) as string | null;
    if (address != null) {
      writer.writeString(1, address);
    }
    const sig = jspb.Message.getField(message, 2) as Uint8Array | null;
    if (sig != null) {
      writer.writeBytes(2, sig);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TronTypedDataSignature {
  export type AsObject = {
    address?: string;
    signature?: Uint8Array;
  };
}

// ── Runtime Registration ──────────────────────────────────────────────
// Inject Tron message types into the KeepKey transport registries.

export function registerTronMessages() {
  const mt = Messages.MessageType as unknown as Record<string, number>;
  mt["MESSAGETYPE_TRONGETADDRESS"] = MESSAGETYPE_TRONGETADDRESS;
  mt["MESSAGETYPE_TRONADDRESS"] = MESSAGETYPE_TRONADDRESS;
  mt["MESSAGETYPE_TRONSIGNTX"] = MESSAGETYPE_TRONSIGNTX;
  mt["MESSAGETYPE_TRONSIGNEDTX"] = MESSAGETYPE_TRONSIGNEDTX;
  mt["MESSAGETYPE_TRONSIGNMESSAGE"] = MESSAGETYPE_TRONSIGNMESSAGE;
  mt["MESSAGETYPE_TRONMESSAGESIGNATURE"] = MESSAGETYPE_TRONMESSAGESIGNATURE;
  mt["MESSAGETYPE_TRONVERIFYMESSAGE"] = MESSAGETYPE_TRONVERIFYMESSAGE;
  mt["MESSAGETYPE_TRONSIGNTYPEDHASH"] = MESSAGETYPE_TRONSIGNTYPEDHASH;
  mt["MESSAGETYPE_TRONTYPEDDATASIGNATURE"] = MESSAGETYPE_TRONTYPEDDATASIGNATURE;

  messageNameRegistry[MESSAGETYPE_TRONGETADDRESS] = "TronGetAddress";
  messageNameRegistry[MESSAGETYPE_TRONADDRESS] = "TronAddress";
  messageNameRegistry[MESSAGETYPE_TRONSIGNTX] = "TronSignTx";
  messageNameRegistry[MESSAGETYPE_TRONSIGNEDTX] = "TronSignedTx";
  messageNameRegistry[MESSAGETYPE_TRONSIGNMESSAGE] = "TronSignMessage";
  messageNameRegistry[MESSAGETYPE_TRONMESSAGESIGNATURE] = "TronMessageSignature";
  messageNameRegistry[MESSAGETYPE_TRONVERIFYMESSAGE] = "TronVerifyMessage";
  messageNameRegistry[MESSAGETYPE_TRONSIGNTYPEDHASH] = "TronSignTypedHash";
  messageNameRegistry[MESSAGETYPE_TRONTYPEDDATASIGNATURE] = "TronTypedDataSignature";

  messageTypeRegistry[MESSAGETYPE_TRONGETADDRESS] = TronGetAddress as any;
  messageTypeRegistry[MESSAGETYPE_TRONADDRESS] = TronAddress as any;
  messageTypeRegistry[MESSAGETYPE_TRONSIGNTX] = TronSignTx as any;
  messageTypeRegistry[MESSAGETYPE_TRONSIGNEDTX] = TronSignedTx as any;
  messageTypeRegistry[MESSAGETYPE_TRONSIGNMESSAGE] = TronSignMessage as any;
  messageTypeRegistry[MESSAGETYPE_TRONMESSAGESIGNATURE] = TronMessageSignature as any;
  messageTypeRegistry[MESSAGETYPE_TRONVERIFYMESSAGE] = TronVerifyMessage as any;
  messageTypeRegistry[MESSAGETYPE_TRONSIGNTYPEDHASH] = TronSignTypedHash as any;
  messageTypeRegistry[MESSAGETYPE_TRONTYPEDDATASIGNATURE] = TronTypedDataSignature as any;
}

// Register on module load
registerTronMessages();

// ── Wallet Methods ──────────────────────────────────────────────────

// Tron derivation: m/44'/195'/0'/0/0 (secp256k1, 5 components)
export function tronGetAccountPaths(msg: core.TronGetAccountPaths): Array<core.TronAccountPath> {
  return [
    {
      addressNList: [0x80000000 + 44, 0x80000000 + core.slip44ByCoin("Tron"), 0x80000000 + msg.accountIdx, 0, 0],
    },
  ];
}

export async function tronGetAddress(transport: Transport, msg: core.TronGetAddress): Promise<string> {
  const getAddr = new TronGetAddress();
  getAddr.setAddressNList(msg.addressNList);
  getAddr.setShowDisplay(msg.showDisplay !== false);
  const response = await transport.call(MESSAGETYPE_TRONGETADDRESS, getAddr, {
    msgTimeout: core.LONG_TIMEOUT,
  });

  const tronAddress = response.proto as TronAddress;
  return core.mustBeDefined(tronAddress.getAddress());
}

export async function tronSignTx(transport: Transport, msg: core.TronSignTx): Promise<core.TronSignedTx> {
  return transport.lockDuring(async () => {
    const signTx = new TronSignTx();
    signTx.setAddressNList(msg.addressNList);

    // Accept rawTx as Uint8Array, Buffer, hex string, or base64 string
    let rawBytes: Uint8Array;
    if (msg.rawTx instanceof Uint8Array) {
      rawBytes = msg.rawTx;
    } else if (typeof msg.rawTx === "string") {
      if (/^[0-9a-fA-F]+$/.test(msg.rawTx)) {
        rawBytes = core.fromHexString(msg.rawTx);
      } else {
        rawBytes = Uint8Array.from(Buffer.from(msg.rawTx, "base64"));
      }
    } else {
      rawBytes = new Uint8Array(msg.rawTx as any);
    }
    signTx.setRawData(rawBytes);

    // Structured clear-signing fields: if tronGridTx is provided with raw_data,
    // extract the structured transaction fields so firmware can show a proper
    // clear-sign confirmation (amount + recipient) instead of blind-signing.
    const tgTx = (msg as any).tronGridTx;
    const rawData = tgTx?.raw_data;
    if (rawData?.ref_block_bytes && rawData?.ref_block_hash && rawData?.expiration && rawData?.timestamp) {
      // Block reference fields (required for structured mode)
      signTx.setRefBlockBytes(core.fromHexString(rawData.ref_block_bytes));
      signTx.setRefBlockHash(core.fromHexString(rawData.ref_block_hash));
      signTx.setExpiration(rawData.expiration);
      signTx.setTimestamp(rawData.timestamp);

      // Extract TransferContract from the contract array
      const contract = rawData.contract?.[0];
      if (contract?.type === "TransferContract" && contract?.parameter?.value) {
        const transfer = new TronTransferContract();
        // Use msg.toAddress (Base58 T...) — TronGrid raw_data has hex 41... which firmware rejects
        transfer.setToAddress(msg.toAddress || contract.parameter.value.to_address);
        transfer.setAmount(contract.parameter.value.amount);
        signTx.setTransfer(transfer);
      }

      if (rawData.data) {
        // Memo/data field
        signTx.setData(core.fromHexString(rawData.data));
      }
    }

    // Legacy display fields (kept for backwards compat with older firmware)
    if (msg.toAddress) signTx.setToAddress(msg.toAddress);
    if (msg.amount != null) signTx.setAmount(Number(msg.amount));

    const resp = await transport.call(MESSAGETYPE_TRONSIGNTX, signTx, {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });

    if (resp.message_enum !== MESSAGETYPE_TRONSIGNEDTX) {
      throw new Error(`tron: unexpected response ${resp.message_type}`);
    }

    const signedTx = resp.proto as TronSignedTx;
    return {
      signature: signedTx.getSignature_asU8(),
    };
  });
}

// Tron message-signing helpers (TIP-191 personal_sign + TIP-712 typed-hash). The
// firmware path validation requires m/44'/195'/...; that's enforced device-side.

export async function tronSignMessage(
  transport: Transport,
  msg: core.TronSignMessage,
): Promise<core.TronMessageSignature> {
  return transport.lockDuring(async () => {
    const signMsg = new TronSignMessage();
    signMsg.setAddressNList(msg.addressNList);

    const messageBytes =
      msg.message instanceof Uint8Array
        ? msg.message
        : typeof msg.message === "string"
        ? new TextEncoder().encode(msg.message)
        : new Uint8Array(msg.message as any);
    signMsg.setMessage(messageBytes);

    if (msg.showDisplay !== undefined) signMsg.setShowDisplay(msg.showDisplay);

    const resp = await transport.call(MESSAGETYPE_TRONSIGNMESSAGE, signMsg, {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });

    if (resp.message_enum !== MESSAGETYPE_TRONMESSAGESIGNATURE) {
      throw new Error(`tron: unexpected response ${resp.message_type}`);
    }

    const sig = resp.proto as TronMessageSignature;
    return {
      address: core.mustBeDefined(sig.getAddress()),
      signature: core.mustBeDefined(sig.getSignature()),
    };
  });
}

export async function tronVerifyMessage(
  transport: Transport,
  msg: core.TronVerifyMessage,
): Promise<boolean> {
  return transport.lockDuring(async () => {
    const verifyMsg = new TronVerifyMessage();
    verifyMsg.setAddress(msg.address);

    const sigBytes =
      msg.signature instanceof Uint8Array
        ? msg.signature
        : typeof msg.signature === "string"
        ? core.fromHexString(msg.signature.replace(/^0x/i, ""))
        : new Uint8Array(msg.signature as any);
    verifyMsg.setSignature(sigBytes);

    const messageBytes =
      msg.message instanceof Uint8Array
        ? msg.message
        : typeof msg.message === "string"
        ? new TextEncoder().encode(msg.message)
        : new Uint8Array(msg.message as any);
    verifyMsg.setMessage(messageBytes);

    const resp = await transport.call(MESSAGETYPE_TRONVERIFYMESSAGE, verifyMsg, {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });

    // Firmware returns Success on valid sig, Failure otherwise.
    // transport.call already throws on Failure, so reaching here = verified.
    return resp.message_enum === MESSAGETYPE_SUCCESS;
  });
}

export async function tronSignTypedHash(
  transport: Transport,
  msg: core.TronSignTypedHash,
): Promise<core.TronTypedDataSignature> {
  return transport.lockDuring(async () => {
    const signMsg = new TronSignTypedHash();
    signMsg.setAddressNList(msg.addressNList);

    const ds =
      msg.domainSeparatorHash instanceof Uint8Array
        ? msg.domainSeparatorHash
        : core.fromHexString((msg.domainSeparatorHash as string).replace(/^0x/i, ""));
    if (ds.length !== 32) {
      throw new Error(`tron: domain_separator_hash must be exactly 32 bytes, got ${ds.length}`);
    }
    signMsg.setDomainSeparatorHash(ds);

    if (msg.messageHash != null) {
      const mh =
        msg.messageHash instanceof Uint8Array
          ? msg.messageHash
          : core.fromHexString((msg.messageHash as string).replace(/^0x/i, ""));
      if (mh.length !== 32) {
        throw new Error(`tron: message_hash must be exactly 32 bytes, got ${mh.length}`);
      }
      signMsg.setMessageHash(mh);
    }

    const resp = await transport.call(MESSAGETYPE_TRONSIGNTYPEDHASH, signMsg, {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });

    if (resp.message_enum !== MESSAGETYPE_TRONTYPEDDATASIGNATURE) {
      throw new Error(`tron: unexpected response ${resp.message_type}`);
    }

    const sig = resp.proto as TronTypedDataSignature;
    return {
      address: core.mustBeDefined(sig.getAddress()),
      signature: core.mustBeDefined(sig.getSignature()),
    };
  });
}

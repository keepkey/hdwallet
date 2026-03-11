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

export namespace TronAddress {
  export type AsObject = {
    address?: string;
  };
}

/**
 * TronSignTx: address_n(1), coin_name(2), raw_data(3, bytes),
 *             ref_block_bytes(4, bytes), ref_block_hash(5, bytes),
 *             expiration(6, uint64), contract_type(7, string),
 *             to_address(8, string), amount(9, uint64)
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
  getRawData_asB64(): string {
    const val = this.getRawData();
    if (typeof val === "string") return val;
    return jspb.Message.bytesAsB64(val as Uint8Array);
  }
  setRawData(value: Uint8Array | string): void {
    jspb.Message.setField(this, 3, value);
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
        default:
          reader.skipField();
          break;
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: TronSignTx, writer: jspb.BinaryWriter): void {
    const addressN = message.getAddressNList();
    if (addressN.length > 0) {
      writer.writeRepeatedUint32(1, addressN);
    }
    const coinName = jspb.Message.getField(message, 2) as string | null;
    if (coinName != null) {
      writer.writeString(2, coinName);
    }
    const rawData = message.getRawData_asU8();
    if (rawData.length > 0) {
      writer.writeBytes(3, rawData);
    }
  }
}

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

export namespace TronSignedTx {
  export type AsObject = {
    signature: Uint8Array | string;
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

  messageNameRegistry[MESSAGETYPE_TRONGETADDRESS] = "TronGetAddress";
  messageNameRegistry[MESSAGETYPE_TRONADDRESS] = "TronAddress";
  messageNameRegistry[MESSAGETYPE_TRONSIGNTX] = "TronSignTx";
  messageNameRegistry[MESSAGETYPE_TRONSIGNEDTX] = "TronSignedTx";

  messageTypeRegistry[MESSAGETYPE_TRONGETADDRESS] = TronGetAddress as any;
  messageTypeRegistry[MESSAGETYPE_TRONADDRESS] = TronAddress as any;
  messageTypeRegistry[MESSAGETYPE_TRONSIGNTX] = TronSignTx as any;
  messageTypeRegistry[MESSAGETYPE_TRONSIGNEDTX] = TronSignedTx as any;
}

// Register on module load
registerTronMessages();

// ── Wallet Methods ──────────────────────────────────────────────────

// Tron derivation: m/44'/195'/0'/0/0 (secp256k1, 5 components)
export function tronGetAccountPaths(msg: core.TronGetAccountPaths): Array<core.TronAccountPath> {
  return [
    {
      addressNList: [
        0x80000000 + 44,
        0x80000000 + core.slip44ByCoin("Tron"),
        0x80000000 + msg.accountIdx,
        0,
        0,
      ],
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

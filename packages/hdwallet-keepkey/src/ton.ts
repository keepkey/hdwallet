import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as core from "@keepkey/hdwallet-core";
import * as jspb from "google-protobuf";

import { Transport } from "./transport";
import { messageNameRegistry, messageTypeRegistry } from "./typeRegistry";

// Cast to access methods that exist at runtime but not in @types/google-protobuf
const Msg = jspb.Message as any;

// ── TON Message Type IDs (from messages.proto) ─────────────────────
const MESSAGETYPE_TONGETADDRESS = 1500;
const MESSAGETYPE_TONADDRESS = 1501;
const MESSAGETYPE_TONSIGNTX = 1502;
const MESSAGETYPE_TONSIGNEDTX = 1503;

// ── Protobuf Shims ──────────────────────────────────────────────────
// Hand-rolled jspb.Message subclasses matching messages-ton.proto.
// These are wire-compatible with the firmware's protobuf encoding.

/**
 * TonGetAddress: address_n(1, repeated uint32), coin_name(2, string),
 *                show_display(3, bool), bounceable(4, bool),
 *                testnet(5, bool), workchain(6, sint32)
 */
export class TonGetAddress extends jspb.Message {
  static repeatedFields_ = [1];

  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, TonGetAddress.repeatedFields_, null);
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
    return jspb.Message.getFieldWithDefault(this, 2, "Ton") as string;
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

  getBounceable(): boolean | undefined {
    const f = jspb.Message.getField(this, 4);
    return f == null ? true : !!f;
  }
  setBounceable(value: boolean): void {
    jspb.Message.setField(this, 4, value ? 1 : 0);
  }

  getTestnet(): boolean | undefined {
    const f = jspb.Message.getField(this, 5);
    return f == null ? false : !!f;
  }
  setTestnet(value: boolean): void {
    jspb.Message.setField(this, 5, value ? 1 : 0);
  }

  getWorkchain(): number {
    return jspb.Message.getFieldWithDefault(this, 6, 0) as number;
  }
  setWorkchain(value: number): void {
    jspb.Message.setField(this, 6, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    TonGetAddress.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(_includeInstance?: boolean): TonGetAddress.AsObject {
    return {
      addressNList: this.getAddressNList(),
      coinName: this.getCoinName(),
      showDisplay: this.getShowDisplay(),
      bounceable: this.getBounceable(),
      testnet: this.getTestnet(),
      workchain: this.getWorkchain(),
    };
  }

  static toObject(_includeInstance: boolean, msg: TonGetAddress): TonGetAddress.AsObject {
    return msg.toObject(_includeInstance);
  }

  static deserializeBinary(bytes: Uint8Array): TonGetAddress {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new TonGetAddress();
    return TonGetAddress.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: TonGetAddress, reader: jspb.BinaryReader): TonGetAddress {
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
        case 4:
          msg.setBounceable(reader.readBool());
          break;
        case 5:
          msg.setTestnet(reader.readBool());
          break;
        case 6:
          msg.setWorkchain(reader.readSint32());
          break;
        default:
          reader.skipField();
          break;
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: TonGetAddress, writer: jspb.BinaryWriter): void {
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
    const bounceable = jspb.Message.getField(message, 4);
    if (bounceable != null) {
      writer.writeBool(4, !!bounceable);
    }
    const testnet = jspb.Message.getField(message, 5);
    if (testnet != null) {
      writer.writeBool(5, !!testnet);
    }
    const workchain = jspb.Message.getField(message, 6) as number | null;
    if (workchain != null) {
      writer.writeSint32(6, workchain);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TonGetAddress {
  export type AsObject = {
    addressNList: number[];
    coinName?: string;
    showDisplay?: boolean;
    bounceable?: boolean;
    testnet?: boolean;
    workchain: number;
  };
}

/**
 * TonAddress: address(1, string), raw_address(2, string)
 */
export class TonAddress extends jspb.Message {
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

  getRawAddress(): string | undefined {
    return jspb.Message.getFieldWithDefault(this, 2, "") as string;
  }
  setRawAddress(value: string): void {
    jspb.Message.setField(this, 2, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    TonAddress.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(_includeInstance?: boolean): TonAddress.AsObject {
    return {
      address: this.getAddress(),
      rawAddress: this.getRawAddress(),
    };
  }

  static toObject(_includeInstance: boolean, msg: TonAddress): TonAddress.AsObject {
    return msg.toObject(_includeInstance);
  }

  static deserializeBinary(bytes: Uint8Array): TonAddress {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new TonAddress();
    return TonAddress.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: TonAddress, reader: jspb.BinaryReader): TonAddress {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      const field = reader.getFieldNumber();
      switch (field) {
        case 1:
          msg.setAddress(reader.readString());
          break;
        case 2:
          msg.setRawAddress(reader.readString());
          break;
        default:
          reader.skipField();
          break;
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: TonAddress, writer: jspb.BinaryWriter): void {
    const address = jspb.Message.getField(message, 1) as string | null;
    if (address != null) {
      writer.writeString(1, address);
    }
    const rawAddress = jspb.Message.getField(message, 2) as string | null;
    if (rawAddress != null) {
      writer.writeString(2, rawAddress);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TonAddress {
  export type AsObject = {
    address?: string;
    rawAddress?: string;
  };
}

/**
 * TonSignTx: address_n(1, repeated uint32), coin_name(2, string),
 *            raw_tx(3, bytes), expire_at(4, uint32), seqno(5, uint32),
 *            workchain(6, sint32), to_address(7, string), amount(8, uint64),
 *            bounce(9, bool), memo(10, string), is_deploy(11, bool)
 */
export class TonSignTx extends jspb.Message {
  static repeatedFields_ = [1];

  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, TonSignTx.repeatedFields_, null);
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
    return jspb.Message.getFieldWithDefault(this, 2, "Ton") as string;
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

  getExpireAt(): number {
    return jspb.Message.getFieldWithDefault(this, 4, 0) as number;
  }
  setExpireAt(value: number): void {
    jspb.Message.setField(this, 4, value);
  }

  getSeqno(): number {
    return jspb.Message.getFieldWithDefault(this, 5, 0) as number;
  }
  setSeqno(value: number): void {
    jspb.Message.setField(this, 5, value);
  }

  getWorkchain(): number {
    return jspb.Message.getFieldWithDefault(this, 6, 0) as number;
  }
  setWorkchain(value: number): void {
    jspb.Message.setField(this, 6, value);
  }

  getToAddress(): string | undefined {
    return jspb.Message.getFieldWithDefault(this, 7, "") as string;
  }
  setToAddress(value: string): void {
    jspb.Message.setField(this, 7, value);
  }

  getAmount(): string {
    // uint64 in protobuf — use string to avoid JS number precision issues
    return jspb.Message.getFieldWithDefault(this, 8, "0") as string;
  }
  setAmount(value: string | number): void {
    jspb.Message.setField(this, 8, String(value));
  }

  getBounce(): boolean {
    return jspb.Message.getFieldWithDefault(this, 9, false) as boolean;
  }
  setBounce(value: boolean): void {
    jspb.Message.setField(this, 9, value);
  }

  getMemo(): string | undefined {
    return jspb.Message.getFieldWithDefault(this, 10, "") as string;
  }
  setMemo(value: string): void {
    jspb.Message.setField(this, 10, value);
  }

  getIsDeploy(): boolean {
    return jspb.Message.getFieldWithDefault(this, 11, false) as boolean;
  }
  setIsDeploy(value: boolean): void {
    jspb.Message.setField(this, 11, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    TonSignTx.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(_includeInstance?: boolean): TonSignTx.AsObject {
    return {
      addressNList: this.getAddressNList(),
      coinName: this.getCoinName(),
      rawTx: this.getRawTx(),
      expireAt: this.getExpireAt(),
      seqno: this.getSeqno(),
      workchain: this.getWorkchain(),
      toAddress: this.getToAddress(),
      amount: this.getAmount(),
      bounce: this.getBounce(),
      memo: this.getMemo(),
      isDeploy: this.getIsDeploy(),
    };
  }

  static toObject(_includeInstance: boolean, msg: TonSignTx): TonSignTx.AsObject {
    return msg.toObject(_includeInstance);
  }

  static deserializeBinary(bytes: Uint8Array): TonSignTx {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new TonSignTx();
    return TonSignTx.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: TonSignTx, reader: jspb.BinaryReader): TonSignTx {
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
        case 4:
          msg.setExpireAt(reader.readUint32());
          break;
        case 5:
          msg.setSeqno(reader.readUint32());
          break;
        case 6:
          msg.setWorkchain(reader.readSint32());
          break;
        case 7:
          msg.setToAddress(reader.readString());
          break;
        case 8:
          msg.setAmount(reader.readUint64String());
          break;
        case 9:
          msg.setBounce(reader.readBool());
          break;
        case 10:
          msg.setMemo(reader.readString());
          break;
        case 11:
          msg.setIsDeploy(reader.readBool());
          break;
        default:
          reader.skipField();
          break;
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: TonSignTx, writer: jspb.BinaryWriter): void {
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
    const expireAt = jspb.Message.getField(message, 4) as number | null;
    if (expireAt != null) {
      writer.writeUint32(4, expireAt);
    }
    const seqno = jspb.Message.getField(message, 5) as number | null;
    if (seqno != null) {
      writer.writeUint32(5, seqno);
    }
    const workchain = jspb.Message.getField(message, 6) as number | null;
    if (workchain != null) {
      writer.writeSint32(6, workchain);
    }
    const toAddress = jspb.Message.getField(message, 7) as string | null;
    if (toAddress != null) {
      writer.writeString(7, toAddress);
    }
    const amount = message.getAmount();
    if (amount !== "0") {
      writer.writeUint64String(8, amount);
    }
    const bounce = jspb.Message.getField(message, 9) as boolean | null;
    if (bounce != null) {
      writer.writeBool(9, bounce);
    }
    const memo = jspb.Message.getField(message, 10) as string | null;
    if (memo != null) {
      writer.writeString(10, memo);
    }
    const isDeploy = jspb.Message.getField(message, 11) as boolean | null;
    if (isDeploy != null) {
      writer.writeBool(11, isDeploy);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TonSignTx {
  export type AsObject = {
    addressNList: number[];
    coinName?: string;
    rawTx: Uint8Array | string;
    expireAt: number;
    seqno: number;
    workchain: number;
    toAddress?: string;
    amount: string;
    bounce?: boolean;
    memo?: string;
    isDeploy?: boolean;
  };
}

/**
 * TonSignedTx: signature(1, bytes)
 */
export class TonSignedTx extends jspb.Message {
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
    TonSignedTx.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(_includeInstance?: boolean): TonSignedTx.AsObject {
    return { signature: this.getSignature() };
  }

  static toObject(_includeInstance: boolean, msg: TonSignedTx): TonSignedTx.AsObject {
    return msg.toObject(_includeInstance);
  }

  static deserializeBinary(bytes: Uint8Array): TonSignedTx {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new TonSignedTx();
    return TonSignedTx.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: TonSignedTx, reader: jspb.BinaryReader): TonSignedTx {
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

  static serializeBinaryToWriter(message: TonSignedTx, writer: jspb.BinaryWriter): void {
    const sig = message.getSignature_asU8();
    if (sig.length > 0) {
      writer.writeBytes(1, sig);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace TonSignedTx {
  export type AsObject = {
    signature: Uint8Array | string;
  };
}

// ── Runtime Registration ──────────────────────────────────────────────
// Inject TON message types into the KeepKey transport registries.

export function registerTonMessages() {
  const mt = Messages.MessageType as unknown as Record<string, number>;
  mt["MESSAGETYPE_TONGETADDRESS"] = MESSAGETYPE_TONGETADDRESS;
  mt["MESSAGETYPE_TONADDRESS"] = MESSAGETYPE_TONADDRESS;
  mt["MESSAGETYPE_TONSIGNTX"] = MESSAGETYPE_TONSIGNTX;
  mt["MESSAGETYPE_TONSIGNEDTX"] = MESSAGETYPE_TONSIGNEDTX;

  messageNameRegistry[MESSAGETYPE_TONGETADDRESS] = "TonGetAddress";
  messageNameRegistry[MESSAGETYPE_TONADDRESS] = "TonAddress";
  messageNameRegistry[MESSAGETYPE_TONSIGNTX] = "TonSignTx";
  messageNameRegistry[MESSAGETYPE_TONSIGNEDTX] = "TonSignedTx";

  messageTypeRegistry[MESSAGETYPE_TONGETADDRESS] = TonGetAddress as any;
  messageTypeRegistry[MESSAGETYPE_TONADDRESS] = TonAddress as any;
  messageTypeRegistry[MESSAGETYPE_TONSIGNTX] = TonSignTx as any;
  messageTypeRegistry[MESSAGETYPE_TONSIGNEDTX] = TonSignedTx as any;
}

// Register on module load
registerTonMessages();

// ── Wallet Methods ──────────────────────────────────────────────────

// TON derivation: m/44'/607'/account' (all hardened, Ed25519)
export function tonGetAccountPaths(msg: core.TonGetAccountPaths): Array<core.TonAccountPath> {
  return [
    {
      addressNList: [0x80000000 + 44, 0x80000000 + core.slip44ByCoin("Ton"), 0x80000000 + msg.accountIdx],
    },
  ];
}

export async function tonGetAddress(transport: Transport, msg: core.TonGetAddress): Promise<string> {
  const getAddr = new TonGetAddress();
  getAddr.setAddressNList(msg.addressNList);
  getAddr.setShowDisplay(msg.showDisplay !== false);
  if (msg.bounceable !== undefined) getAddr.setBounceable(msg.bounceable);
  if (msg.testnet !== undefined) getAddr.setTestnet(msg.testnet);
  if (msg.workchain !== undefined) getAddr.setWorkchain(msg.workchain);

  const response = await transport.call(MESSAGETYPE_TONGETADDRESS, getAddr, {
    msgTimeout: core.LONG_TIMEOUT,
  });

  const tonAddress = response.proto as TonAddress;
  return core.mustBeDefined(tonAddress.getAddress());
}

export async function tonSignTx(transport: Transport, msg: core.TonSignTx): Promise<core.TonSignedTx> {
  return transport.lockDuring(async () => {
    const signTx = new TonSignTx();
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
    signTx.setRawTx(rawBytes);

    if (msg.expireAt !== undefined) signTx.setExpireAt(msg.expireAt);
    if (msg.seqno !== undefined) signTx.setSeqno(msg.seqno);
    if (msg.workchain !== undefined) signTx.setWorkchain(msg.workchain);
    if (msg.toAddress !== undefined) signTx.setToAddress(msg.toAddress);
    if (msg.amount !== undefined) signTx.setAmount(msg.amount);
    if (msg.bounce !== undefined) signTx.setBounce(msg.bounce);
    if (msg.memo !== undefined) signTx.setMemo(msg.memo);
    if (msg.isDeploy !== undefined) signTx.setIsDeploy(msg.isDeploy);

    const resp = await transport.call(MESSAGETYPE_TONSIGNTX, signTx, {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });

    if (resp.message_enum !== MESSAGETYPE_TONSIGNEDTX) {
      throw new Error(`ton: unexpected response ${resp.message_type}`);
    }

    const signedTx = resp.proto as TonSignedTx;
    return {
      signature: signedTx.getSignature_asU8(),
    };
  });
}

import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as core from "@keepkey/hdwallet-core";
import * as jspb from "google-protobuf";

import { Transport } from "./transport";
import { messageNameRegistry, messageTypeRegistry } from "./typeRegistry";

const Msg = jspb.Message as any;

// ── Hive Message Type IDs (messages-hive.proto, wire IDs 1600–1609) ───
const MESSAGETYPE_HIVEGETPUBLICKEY = 1600;
const MESSAGETYPE_HIVEPUBLICKEY = 1601;
const MESSAGETYPE_HIVESIGNTX = 1602;
const MESSAGETYPE_HIVESIGNEDTX = 1603;
const MESSAGETYPE_HIVEGETPUBLICKEYS = 1604;
const MESSAGETYPE_HIVEPUBLICKEYS = 1605;
const MESSAGETYPE_HIVESIGNACCOUNTCREATE = 1606;
const MESSAGETYPE_HIVESIGNEDACCOUNTCREATE = 1607;
const MESSAGETYPE_HIVESIGNACCOUNTUPDATE = 1608;
const MESSAGETYPE_HIVESIGNEDACCOUNTUPDATE = 1609;
const MESSAGETYPE_HIVESIGNMESSAGE = 1614;
const MESSAGETYPE_HIVESIGNEDMESSAGE = 1615;
const MESSAGETYPE_HIVESIGNOPERATIONS = 1616;
const MESSAGETYPE_HIVESIGNEDOPERATIONS = 1617;

// ── Protobuf Shims ─────────────────────────────────────────────────────

/**
 * HiveGetPublicKey: address_n(1, repeated uint32), show_display(2, bool)
 */
export class HiveGetPublicKey extends jspb.Message {
  static repeatedFields_ = [1];

  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, HiveGetPublicKey.repeatedFields_, null);
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

  getShowDisplay(): boolean | undefined {
    const f = jspb.Message.getField(this, 2);
    return f == null ? undefined : !!f;
  }
  setShowDisplay(value: boolean): void {
    jspb.Message.setField(this, 2, value ? 1 : 0);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    HiveGetPublicKey.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(): object {
    return { addressNList: this.getAddressNList(), showDisplay: this.getShowDisplay() };
  }
  static toObject(_: boolean, msg: HiveGetPublicKey): object {
    return msg.toObject();
  }

  static deserializeBinary(bytes: Uint8Array): HiveGetPublicKey {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new HiveGetPublicKey();
    return HiveGetPublicKey.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: HiveGetPublicKey, reader: jspb.BinaryReader): HiveGetPublicKey {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1: {
          const values = reader.isDelimited() ? reader.readPackedUint32() : [reader.readUint32()];
          for (const v of values) msg.addAddressN(v);
          break;
        }
        case 2:
          msg.setShowDisplay(reader.readBool());
          break;
        default:
          reader.skipField();
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: HiveGetPublicKey, writer: jspb.BinaryWriter): void {
    const addressN = message.getAddressNList();
    if (addressN.length > 0) writer.writeRepeatedUint32(1, addressN);
    const showDisplay = jspb.Message.getField(message, 2);
    if (showDisplay != null) writer.writeBool(2, !!showDisplay);
  }
}

/**
 * HivePublicKey: public_key(1, string), raw_public_key(2, bytes)
 */
export class HivePublicKey extends jspb.Message {
  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, null, null);
  }

  getPublicKey(): string | undefined {
    return jspb.Message.getFieldWithDefault(this, 1, "") as string;
  }
  setPublicKey(value: string): void {
    jspb.Message.setField(this, 1, value);
  }

  getRawPublicKey(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 2, "") as Uint8Array | string;
  }
  getRawPublicKey_asU8(): Uint8Array {
    const val = this.getRawPublicKey();
    if (val instanceof Uint8Array) return val;
    return jspb.Message.bytesAsU8(val as string);
  }
  setRawPublicKey(value: Uint8Array | string): void {
    jspb.Message.setField(this, 2, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    HivePublicKey.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(): object {
    return { publicKey: this.getPublicKey(), rawPublicKey: this.getRawPublicKey() };
  }
  static toObject(_: boolean, msg: HivePublicKey): object {
    return msg.toObject();
  }

  static deserializeBinary(bytes: Uint8Array): HivePublicKey {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new HivePublicKey();
    return HivePublicKey.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: HivePublicKey, reader: jspb.BinaryReader): HivePublicKey {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1:
          msg.setPublicKey(reader.readString());
          break;
        case 2:
          msg.setRawPublicKey(reader.readBytes());
          break;
        default:
          reader.skipField();
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: HivePublicKey, writer: jspb.BinaryWriter): void {
    const pk = jspb.Message.getField(message, 1) as string | null;
    if (pk != null) writer.writeString(1, pk);
    const raw = message.getRawPublicKey_asU8();
    if (raw.length > 0) writer.writeBytes(2, raw);
  }
}

/**
 * HiveSignTx: address_n(1), chain_id(2,bytes), ref_block_num(3,uint32),
 *             ref_block_prefix(4,uint32), expiration(5,uint32), from(6,string),
 *             to(7,string), amount(8,uint64), decimals(9,uint32),
 *             asset_symbol(10,string), memo(11,string)
 */
export class HiveSignTx extends jspb.Message {
  static repeatedFields_ = [1];

  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, HiveSignTx.repeatedFields_, null);
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

  getChainId(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 2, "") as Uint8Array | string;
  }
  getChainId_asU8(): Uint8Array {
    const val = this.getChainId();
    if (val instanceof Uint8Array) return val;
    return jspb.Message.bytesAsU8(val as string);
  }
  setChainId(value: Uint8Array | string): void {
    jspb.Message.setField(this, 2, value);
  }

  getRefBlockNum(): number {
    return jspb.Message.getFieldWithDefault(this, 3, 0) as number;
  }
  setRefBlockNum(value: number): void {
    jspb.Message.setField(this, 3, value);
  }

  getRefBlockPrefix(): number {
    return jspb.Message.getFieldWithDefault(this, 4, 0) as number;
  }
  setRefBlockPrefix(value: number): void {
    jspb.Message.setField(this, 4, value);
  }

  getExpiration(): number {
    return jspb.Message.getFieldWithDefault(this, 5, 0) as number;
  }
  setExpiration(value: number): void {
    jspb.Message.setField(this, 5, value);
  }

  getFrom(): string {
    return jspb.Message.getFieldWithDefault(this, 6, "") as string;
  }
  setFrom(value: string): void {
    jspb.Message.setField(this, 6, value);
  }

  getTo(): string {
    return jspb.Message.getFieldWithDefault(this, 7, "") as string;
  }
  setTo(value: string): void {
    jspb.Message.setField(this, 7, value);
  }

  getAmount(): number {
    return jspb.Message.getFieldWithDefault(this, 8, 0) as number;
  }
  setAmount(value: number): void {
    jspb.Message.setField(this, 8, value);
  }

  getDecimals(): number {
    return jspb.Message.getFieldWithDefault(this, 9, 3) as number;
  }
  setDecimals(value: number): void {
    jspb.Message.setField(this, 9, value);
  }

  getAssetSymbol(): string {
    return jspb.Message.getFieldWithDefault(this, 10, "") as string;
  }
  setAssetSymbol(value: string): void {
    jspb.Message.setField(this, 10, value);
  }

  getMemo(): string | undefined {
    return jspb.Message.getFieldWithDefault(this, 11, "") as string;
  }
  setMemo(value: string): void {
    jspb.Message.setField(this, 11, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    HiveSignTx.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(): object {
    return {
      addressNList: this.getAddressNList(),
      chainId: this.getChainId(),
      refBlockNum: this.getRefBlockNum(),
      refBlockPrefix: this.getRefBlockPrefix(),
      expiration: this.getExpiration(),
      from: this.getFrom(),
      to: this.getTo(),
      amount: this.getAmount(),
      decimals: this.getDecimals(),
      assetSymbol: this.getAssetSymbol(),
      memo: this.getMemo(),
    };
  }
  static toObject(_: boolean, msg: HiveSignTx): object {
    return msg.toObject();
  }

  static deserializeBinary(bytes: Uint8Array): HiveSignTx {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new HiveSignTx();
    return HiveSignTx.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: HiveSignTx, reader: jspb.BinaryReader): HiveSignTx {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1: {
          const values = reader.isDelimited() ? reader.readPackedUint32() : [reader.readUint32()];
          for (const v of values) msg.addAddressN(v);
          break;
        }
        case 2:
          msg.setChainId(reader.readBytes());
          break;
        case 3:
          msg.setRefBlockNum(reader.readUint32());
          break;
        case 4:
          msg.setRefBlockPrefix(reader.readUint32());
          break;
        case 5:
          msg.setExpiration(reader.readUint32());
          break;
        case 6:
          msg.setFrom(reader.readString());
          break;
        case 7:
          msg.setTo(reader.readString());
          break;
        case 8:
          msg.setAmount(reader.readUint64());
          break;
        case 9:
          msg.setDecimals(reader.readUint32());
          break;
        case 10:
          msg.setAssetSymbol(reader.readString());
          break;
        case 11:
          msg.setMemo(reader.readString());
          break;
        default:
          reader.skipField();
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: HiveSignTx, writer: jspb.BinaryWriter): void {
    const addressN = message.getAddressNList();
    if (addressN.length > 0) writer.writeRepeatedUint32(1, addressN);
    const chainId = message.getChainId_asU8();
    if (chainId.length > 0) writer.writeBytes(2, chainId);
    const refBlockNum = jspb.Message.getField(message, 3) as number | null;
    if (refBlockNum != null) writer.writeUint32(3, refBlockNum);
    const refBlockPrefix = jspb.Message.getField(message, 4) as number | null;
    if (refBlockPrefix != null) writer.writeUint32(4, refBlockPrefix);
    const expiration = jspb.Message.getField(message, 5) as number | null;
    if (expiration != null) writer.writeUint32(5, expiration);
    const from = jspb.Message.getField(message, 6) as string | null;
    if (from != null) writer.writeString(6, from);
    const to = jspb.Message.getField(message, 7) as string | null;
    if (to != null) writer.writeString(7, to);
    const amount = jspb.Message.getField(message, 8) as number | null;
    if (amount != null) writer.writeUint64(8, amount);
    const decimals = jspb.Message.getField(message, 9) as number | null;
    if (decimals != null) writer.writeUint32(9, decimals);
    const assetSymbol = jspb.Message.getField(message, 10) as string | null;
    if (assetSymbol != null) writer.writeString(10, assetSymbol);
    const memo = jspb.Message.getField(message, 11) as string | null;
    if (memo != null) writer.writeString(11, memo);
  }
}

/**
 * HiveSignedTx: signature(1, bytes), serialized_tx(2, bytes)
 */
export class HiveSignedTx extends jspb.Message {
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
  setSignature(value: Uint8Array | string): void {
    jspb.Message.setField(this, 1, value);
  }

  getSerializedTx(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 2, "") as Uint8Array | string;
  }
  getSerializedTx_asU8(): Uint8Array {
    const val = this.getSerializedTx();
    if (val instanceof Uint8Array) return val;
    return jspb.Message.bytesAsU8(val as string);
  }
  setSerializedTx(value: Uint8Array | string): void {
    jspb.Message.setField(this, 2, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    HiveSignedTx.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(): object {
    return { signature: this.getSignature(), serializedTx: this.getSerializedTx() };
  }
  static toObject(_: boolean, msg: HiveSignedTx): object {
    return msg.toObject();
  }

  static deserializeBinary(bytes: Uint8Array): HiveSignedTx {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new HiveSignedTx();
    return HiveSignedTx.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: HiveSignedTx, reader: jspb.BinaryReader): HiveSignedTx {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1:
          msg.setSignature(reader.readBytes());
          break;
        case 2:
          msg.setSerializedTx(reader.readBytes());
          break;
        default:
          reader.skipField();
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: HiveSignedTx, writer: jspb.BinaryWriter): void {
    const sig = message.getSignature_asU8();
    if (sig.length > 0) writer.writeBytes(1, sig);
    const tx = message.getSerializedTx_asU8();
    if (tx.length > 0) writer.writeBytes(2, tx);
  }
}

/**
 * HiveGetPublicKeys: account_index(1, uint32, default 0), show_display(2, bool)
 */
export class HiveGetPublicKeys extends jspb.Message {
  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, null, null);
  }

  getAccountIndex(): number {
    return jspb.Message.getFieldWithDefault(this, 1, 0) as number;
  }
  setAccountIndex(value: number): void {
    jspb.Message.setField(this, 1, value);
  }

  getShowDisplay(): boolean | undefined {
    const f = jspb.Message.getField(this, 2);
    return f == null ? undefined : !!f;
  }
  setShowDisplay(value: boolean): void {
    jspb.Message.setField(this, 2, value ? 1 : 0);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    HiveGetPublicKeys.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(): object {
    return { accountIndex: this.getAccountIndex(), showDisplay: this.getShowDisplay() };
  }
  static toObject(_: boolean, msg: HiveGetPublicKeys): object {
    return msg.toObject();
  }

  static deserializeBinary(bytes: Uint8Array): HiveGetPublicKeys {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new HiveGetPublicKeys();
    return HiveGetPublicKeys.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: HiveGetPublicKeys, reader: jspb.BinaryReader): HiveGetPublicKeys {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1:
          msg.setAccountIndex(reader.readUint32());
          break;
        case 2:
          msg.setShowDisplay(reader.readBool());
          break;
        default:
          reader.skipField();
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: HiveGetPublicKeys, writer: jspb.BinaryWriter): void {
    const accountIndex = jspb.Message.getField(message, 1) as number | null;
    if (accountIndex != null) writer.writeUint32(1, accountIndex);
    const showDisplay = jspb.Message.getField(message, 2);
    if (showDisplay != null) writer.writeBool(2, !!showDisplay);
  }
}

/**
 * HivePublicKeys: owner_key(1), active_key(2), memo_key(3), posting_key(4) — all string
 */
export class HivePublicKeys extends jspb.Message {
  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, null, null);
  }

  getOwnerKey(): string {
    return jspb.Message.getFieldWithDefault(this, 1, "") as string;
  }
  setOwnerKey(value: string): void {
    jspb.Message.setField(this, 1, value);
  }
  getActiveKey(): string {
    return jspb.Message.getFieldWithDefault(this, 2, "") as string;
  }
  setActiveKey(value: string): void {
    jspb.Message.setField(this, 2, value);
  }
  getMemoKey(): string {
    return jspb.Message.getFieldWithDefault(this, 3, "") as string;
  }
  setMemoKey(value: string): void {
    jspb.Message.setField(this, 3, value);
  }
  getPostingKey(): string {
    return jspb.Message.getFieldWithDefault(this, 4, "") as string;
  }
  setPostingKey(value: string): void {
    jspb.Message.setField(this, 4, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    HivePublicKeys.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(): object {
    return {
      ownerKey: this.getOwnerKey(),
      activeKey: this.getActiveKey(),
      memoKey: this.getMemoKey(),
      postingKey: this.getPostingKey(),
    };
  }
  static toObject(_: boolean, msg: HivePublicKeys): object {
    return msg.toObject();
  }

  static deserializeBinary(bytes: Uint8Array): HivePublicKeys {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new HivePublicKeys();
    return HivePublicKeys.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: HivePublicKeys, reader: jspb.BinaryReader): HivePublicKeys {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1:
          msg.setOwnerKey(reader.readString());
          break;
        case 2:
          msg.setActiveKey(reader.readString());
          break;
        case 3:
          msg.setMemoKey(reader.readString());
          break;
        case 4:
          msg.setPostingKey(reader.readString());
          break;
        default:
          reader.skipField();
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: HivePublicKeys, writer: jspb.BinaryWriter): void {
    for (const [field, _getter] of [
      [1, "getOwnerKey"],
      [2, "getActiveKey"],
      [3, "getMemoKey"],
      [4, "getPostingKey"],
    ] as const) {
      const v = jspb.Message.getField(message, field as number) as string | null;
      if (v != null) writer.writeString(field as number, v);
    }
  }
}

/**
 * HiveSignAccountCreate: address_n(1,repeated), chain_id(2,bytes), ref_block_num(3),
 *   ref_block_prefix(4), expiration(5), creator(6), new_account_name(7), owner_key(8),
 *   active_key(9), posting_key(10), memo_key(11), fee_amount(12,uint64)
 */
export class HiveSignAccountCreate extends jspb.Message {
  static repeatedFields_ = [1];

  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, HiveSignAccountCreate.repeatedFields_, null);
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

  getChainId(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 2, "") as Uint8Array | string;
  }
  getChainId_asU8(): Uint8Array {
    const val = this.getChainId();
    if (val instanceof Uint8Array) return val;
    return jspb.Message.bytesAsU8(val as string);
  }
  setChainId(value: Uint8Array | string): void {
    jspb.Message.setField(this, 2, value);
  }

  getRefBlockNum(): number {
    return jspb.Message.getFieldWithDefault(this, 3, 0) as number;
  }
  setRefBlockNum(value: number): void {
    jspb.Message.setField(this, 3, value);
  }
  getRefBlockPrefix(): number {
    return jspb.Message.getFieldWithDefault(this, 4, 0) as number;
  }
  setRefBlockPrefix(value: number): void {
    jspb.Message.setField(this, 4, value);
  }
  getExpiration(): number {
    return jspb.Message.getFieldWithDefault(this, 5, 0) as number;
  }
  setExpiration(value: number): void {
    jspb.Message.setField(this, 5, value);
  }
  getCreator(): string {
    return jspb.Message.getFieldWithDefault(this, 6, "") as string;
  }
  setCreator(value: string): void {
    jspb.Message.setField(this, 6, value);
  }
  getNewAccountName(): string {
    return jspb.Message.getFieldWithDefault(this, 7, "") as string;
  }
  setNewAccountName(value: string): void {
    jspb.Message.setField(this, 7, value);
  }
  getOwnerKey(): string {
    return jspb.Message.getFieldWithDefault(this, 8, "") as string;
  }
  setOwnerKey(value: string): void {
    jspb.Message.setField(this, 8, value);
  }
  getActiveKey(): string {
    return jspb.Message.getFieldWithDefault(this, 9, "") as string;
  }
  setActiveKey(value: string): void {
    jspb.Message.setField(this, 9, value);
  }
  getPostingKey(): string {
    return jspb.Message.getFieldWithDefault(this, 10, "") as string;
  }
  setPostingKey(value: string): void {
    jspb.Message.setField(this, 10, value);
  }
  getMemoKey(): string {
    return jspb.Message.getFieldWithDefault(this, 11, "") as string;
  }
  setMemoKey(value: string): void {
    jspb.Message.setField(this, 11, value);
  }
  getFeeAmount(): number {
    return jspb.Message.getFieldWithDefault(this, 12, 0) as number;
  }
  setFeeAmount(value: number): void {
    jspb.Message.setField(this, 12, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    HiveSignAccountCreate.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(): object {
    return {
      addressNList: this.getAddressNList(),
      chainId: this.getChainId(),
      refBlockNum: this.getRefBlockNum(),
      refBlockPrefix: this.getRefBlockPrefix(),
      expiration: this.getExpiration(),
      creator: this.getCreator(),
      newAccountName: this.getNewAccountName(),
      ownerKey: this.getOwnerKey(),
      activeKey: this.getActiveKey(),
      postingKey: this.getPostingKey(),
      memoKey: this.getMemoKey(),
      feeAmount: this.getFeeAmount(),
    };
  }
  static toObject(_: boolean, msg: HiveSignAccountCreate): object {
    return msg.toObject();
  }

  static deserializeBinary(bytes: Uint8Array): HiveSignAccountCreate {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new HiveSignAccountCreate();
    return HiveSignAccountCreate.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: HiveSignAccountCreate, reader: jspb.BinaryReader): HiveSignAccountCreate {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1: {
          const values = reader.isDelimited() ? reader.readPackedUint32() : [reader.readUint32()];
          for (const v of values) msg.addAddressN(v);
          break;
        }
        case 2:
          msg.setChainId(reader.readBytes());
          break;
        case 3:
          msg.setRefBlockNum(reader.readUint32());
          break;
        case 4:
          msg.setRefBlockPrefix(reader.readUint32());
          break;
        case 5:
          msg.setExpiration(reader.readUint32());
          break;
        case 6:
          msg.setCreator(reader.readString());
          break;
        case 7:
          msg.setNewAccountName(reader.readString());
          break;
        case 8:
          msg.setOwnerKey(reader.readString());
          break;
        case 9:
          msg.setActiveKey(reader.readString());
          break;
        case 10:
          msg.setPostingKey(reader.readString());
          break;
        case 11:
          msg.setMemoKey(reader.readString());
          break;
        case 12:
          msg.setFeeAmount(reader.readUint64());
          break;
        default:
          reader.skipField();
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: HiveSignAccountCreate, writer: jspb.BinaryWriter): void {
    const addressN = message.getAddressNList();
    if (addressN.length > 0) writer.writeRepeatedUint32(1, addressN);
    const chainId = message.getChainId_asU8();
    if (chainId.length > 0) writer.writeBytes(2, chainId);
    const u32 = (f: number) => jspb.Message.getField(message, f) as number | null;
    const str = (f: number) => jspb.Message.getField(message, f) as string | null;
    if (u32(3) != null) writer.writeUint32(3, u32(3)!);
    if (u32(4) != null) writer.writeUint32(4, u32(4)!);
    if (u32(5) != null) writer.writeUint32(5, u32(5)!);
    if (str(6) != null) writer.writeString(6, str(6)!);
    if (str(7) != null) writer.writeString(7, str(7)!);
    if (str(8) != null) writer.writeString(8, str(8)!);
    if (str(9) != null) writer.writeString(9, str(9)!);
    if (str(10) != null) writer.writeString(10, str(10)!);
    if (str(11) != null) writer.writeString(11, str(11)!);
    if (u32(12) != null) writer.writeUint64(12, u32(12)!);
  }
}

/**
 * HiveSignAccountUpdate: address_n(1,repeated), chain_id(2,bytes), ref_block_num(3),
 *   ref_block_prefix(4), expiration(5), account(6), new_owner_key(7), new_active_key(8),
 *   new_posting_key(9), new_memo_key(10)
 */
export class HiveSignAccountUpdate extends jspb.Message {
  static repeatedFields_ = [1];

  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, HiveSignAccountUpdate.repeatedFields_, null);
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

  getChainId(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 2, "") as Uint8Array | string;
  }
  getChainId_asU8(): Uint8Array {
    const val = this.getChainId();
    if (val instanceof Uint8Array) return val;
    return jspb.Message.bytesAsU8(val as string);
  }
  setChainId(value: Uint8Array | string): void {
    jspb.Message.setField(this, 2, value);
  }

  getRefBlockNum(): number {
    return jspb.Message.getFieldWithDefault(this, 3, 0) as number;
  }
  setRefBlockNum(value: number): void {
    jspb.Message.setField(this, 3, value);
  }
  getRefBlockPrefix(): number {
    return jspb.Message.getFieldWithDefault(this, 4, 0) as number;
  }
  setRefBlockPrefix(value: number): void {
    jspb.Message.setField(this, 4, value);
  }
  getExpiration(): number {
    return jspb.Message.getFieldWithDefault(this, 5, 0) as number;
  }
  setExpiration(value: number): void {
    jspb.Message.setField(this, 5, value);
  }
  getAccount(): string {
    return jspb.Message.getFieldWithDefault(this, 6, "") as string;
  }
  setAccount(value: string): void {
    jspb.Message.setField(this, 6, value);
  }
  getNewOwnerKey(): string {
    return jspb.Message.getFieldWithDefault(this, 7, "") as string;
  }
  setNewOwnerKey(value: string): void {
    jspb.Message.setField(this, 7, value);
  }
  getNewActiveKey(): string {
    return jspb.Message.getFieldWithDefault(this, 8, "") as string;
  }
  setNewActiveKey(value: string): void {
    jspb.Message.setField(this, 8, value);
  }
  getNewPostingKey(): string {
    return jspb.Message.getFieldWithDefault(this, 9, "") as string;
  }
  setNewPostingKey(value: string): void {
    jspb.Message.setField(this, 9, value);
  }
  getNewMemoKey(): string {
    return jspb.Message.getFieldWithDefault(this, 10, "") as string;
  }
  setNewMemoKey(value: string): void {
    jspb.Message.setField(this, 10, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    HiveSignAccountUpdate.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(): object {
    return {
      addressNList: this.getAddressNList(),
      chainId: this.getChainId(),
      refBlockNum: this.getRefBlockNum(),
      refBlockPrefix: this.getRefBlockPrefix(),
      expiration: this.getExpiration(),
      account: this.getAccount(),
      newOwnerKey: this.getNewOwnerKey(),
      newActiveKey: this.getNewActiveKey(),
      newPostingKey: this.getNewPostingKey(),
      newMemoKey: this.getNewMemoKey(),
    };
  }
  static toObject(_: boolean, msg: HiveSignAccountUpdate): object {
    return msg.toObject();
  }

  static deserializeBinary(bytes: Uint8Array): HiveSignAccountUpdate {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new HiveSignAccountUpdate();
    return HiveSignAccountUpdate.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: HiveSignAccountUpdate, reader: jspb.BinaryReader): HiveSignAccountUpdate {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1: {
          const values = reader.isDelimited() ? reader.readPackedUint32() : [reader.readUint32()];
          for (const v of values) msg.addAddressN(v);
          break;
        }
        case 2:
          msg.setChainId(reader.readBytes());
          break;
        case 3:
          msg.setRefBlockNum(reader.readUint32());
          break;
        case 4:
          msg.setRefBlockPrefix(reader.readUint32());
          break;
        case 5:
          msg.setExpiration(reader.readUint32());
          break;
        case 6:
          msg.setAccount(reader.readString());
          break;
        case 7:
          msg.setNewOwnerKey(reader.readString());
          break;
        case 8:
          msg.setNewActiveKey(reader.readString());
          break;
        case 9:
          msg.setNewPostingKey(reader.readString());
          break;
        case 10:
          msg.setNewMemoKey(reader.readString());
          break;
        default:
          reader.skipField();
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: HiveSignAccountUpdate, writer: jspb.BinaryWriter): void {
    const addressN = message.getAddressNList();
    if (addressN.length > 0) writer.writeRepeatedUint32(1, addressN);
    const chainId = message.getChainId_asU8();
    if (chainId.length > 0) writer.writeBytes(2, chainId);
    const u32 = (f: number) => jspb.Message.getField(message, f) as number | null;
    const str = (f: number) => jspb.Message.getField(message, f) as string | null;
    if (u32(3) != null) writer.writeUint32(3, u32(3)!);
    if (u32(4) != null) writer.writeUint32(4, u32(4)!);
    if (u32(5) != null) writer.writeUint32(5, u32(5)!);
    if (str(6) != null) writer.writeString(6, str(6)!);
    if (str(7) != null) writer.writeString(7, str(7)!);
    if (str(8) != null) writer.writeString(8, str(8)!);
    if (str(9) != null) writer.writeString(9, str(9)!);
    if (str(10) != null) writer.writeString(10, str(10)!);
  }
}

/**
 * HiveSignedAccountCreate / HiveSignedAccountUpdate: signature(1,bytes), serialized_tx(2,bytes).
 * Identical shape to HiveSignedTx.
 */
export class HiveSignedAccountCreate extends jspb.Message {
  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, null, null);
  }
  getSignature_asU8(): Uint8Array {
    const val = jspb.Message.getFieldWithDefault(this, 1, "") as Uint8Array | string;
    return val instanceof Uint8Array ? val : jspb.Message.bytesAsU8(val as string);
  }
  setSignature(value: Uint8Array | string): void {
    jspb.Message.setField(this, 1, value);
  }
  getSerializedTx_asU8(): Uint8Array {
    const val = jspb.Message.getFieldWithDefault(this, 2, "") as Uint8Array | string;
    return val instanceof Uint8Array ? val : jspb.Message.bytesAsU8(val as string);
  }
  setSerializedTx(value: Uint8Array | string): void {
    jspb.Message.setField(this, 2, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    HiveSignedAccountCreate.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }
  toObject(): object {
    return { signature: this.getSignature_asU8(), serializedTx: this.getSerializedTx_asU8() };
  }
  static toObject(_: boolean, msg: HiveSignedAccountCreate): object {
    return msg.toObject();
  }
  static deserializeBinary(bytes: Uint8Array): HiveSignedAccountCreate {
    const reader = new jspb.BinaryReader(bytes);
    return HiveSignedAccountCreate.deserializeBinaryFromReader(new HiveSignedAccountCreate(), reader);
  }
  static deserializeBinaryFromReader(msg: HiveSignedAccountCreate, reader: jspb.BinaryReader): HiveSignedAccountCreate {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1:
          msg.setSignature(reader.readBytes());
          break;
        case 2:
          msg.setSerializedTx(reader.readBytes());
          break;
        default:
          reader.skipField();
      }
    }
    return msg;
  }
  static serializeBinaryToWriter(message: HiveSignedAccountCreate, writer: jspb.BinaryWriter): void {
    const sig = message.getSignature_asU8();
    if (sig.length > 0) writer.writeBytes(1, sig);
    const tx = message.getSerializedTx_asU8();
    if (tx.length > 0) writer.writeBytes(2, tx);
  }
}

export class HiveSignedAccountUpdate extends jspb.Message {
  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, null, null);
  }
  getSignature_asU8(): Uint8Array {
    const val = jspb.Message.getFieldWithDefault(this, 1, "") as Uint8Array | string;
    return val instanceof Uint8Array ? val : jspb.Message.bytesAsU8(val as string);
  }
  setSignature(value: Uint8Array | string): void {
    jspb.Message.setField(this, 1, value);
  }
  getSerializedTx_asU8(): Uint8Array {
    const val = jspb.Message.getFieldWithDefault(this, 2, "") as Uint8Array | string;
    return val instanceof Uint8Array ? val : jspb.Message.bytesAsU8(val as string);
  }
  setSerializedTx(value: Uint8Array | string): void {
    jspb.Message.setField(this, 2, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    HiveSignedAccountUpdate.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }
  toObject(): object {
    return { signature: this.getSignature_asU8(), serializedTx: this.getSerializedTx_asU8() };
  }
  static toObject(_: boolean, msg: HiveSignedAccountUpdate): object {
    return msg.toObject();
  }
  static deserializeBinary(bytes: Uint8Array): HiveSignedAccountUpdate {
    const reader = new jspb.BinaryReader(bytes);
    return HiveSignedAccountUpdate.deserializeBinaryFromReader(new HiveSignedAccountUpdate(), reader);
  }
  static deserializeBinaryFromReader(msg: HiveSignedAccountUpdate, reader: jspb.BinaryReader): HiveSignedAccountUpdate {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1:
          msg.setSignature(reader.readBytes());
          break;
        case 2:
          msg.setSerializedTx(reader.readBytes());
          break;
        default:
          reader.skipField();
      }
    }
    return msg;
  }
  static serializeBinaryToWriter(message: HiveSignedAccountUpdate, writer: jspb.BinaryWriter): void {
    const sig = message.getSignature_asU8();
    if (sig.length > 0) writer.writeBytes(1, sig);
    const tx = message.getSerializedTx_asU8();
    if (tx.length > 0) writer.writeBytes(2, tx);
  }
}

/**
 * HiveSignMessage: address_n(1, repeated uint32), message(2, bytes max 1024).
 * Keychain signBuffer contract: firmware signs SHA256(message) — no chain_id.
 */
export class HiveSignMessage extends jspb.Message {
  static repeatedFields_ = [1];

  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, HiveSignMessage.repeatedFields_, null);
  }

  getAddressNList(): number[] {
    return Msg.getRepeatedField(this, 1) as number[];
  }
  setAddressNList(value: number[]): void {
    jspb.Message.setField(this, 1, value || []);
  }

  getMessage(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 2, "") as Uint8Array | string;
  }
  getMessage_asU8(): Uint8Array {
    const val = this.getMessage();
    if (val instanceof Uint8Array) return val;
    return jspb.Message.bytesAsU8(val as string);
  }
  setMessage(value: Uint8Array | string): void {
    jspb.Message.setField(this, 2, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    HiveSignMessage.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(): object {
    return { addressNList: this.getAddressNList(), message: this.getMessage() };
  }
  static toObject(_: boolean, msg: HiveSignMessage): object {
    return msg.toObject();
  }

  static deserializeBinary(bytes: Uint8Array): HiveSignMessage {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new HiveSignMessage();
    return HiveSignMessage.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: HiveSignMessage, reader: jspb.BinaryReader): HiveSignMessage {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1:
          msg.setAddressNList(reader.readPackedUint32());
          break;
        case 2:
          msg.setMessage(reader.readBytes());
          break;
        default:
          reader.skipField();
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: HiveSignMessage, writer: jspb.BinaryWriter): void {
    const path = message.getAddressNList();
    if (path.length > 0) writer.writeRepeatedUint32(1, path);
    const m = message.getMessage_asU8();
    if (m.length > 0) writer.writeBytes(2, m);
  }
}

/**
 * HiveSignedMessage: signature(1, bytes 65), public_key(2, bytes 33)
 */
export class HiveSignedMessage extends jspb.Message {
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
  setSignature(value: Uint8Array | string): void {
    jspb.Message.setField(this, 1, value);
  }

  getPublicKey(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 2, "") as Uint8Array | string;
  }
  getPublicKey_asU8(): Uint8Array {
    const val = this.getPublicKey();
    if (val instanceof Uint8Array) return val;
    return jspb.Message.bytesAsU8(val as string);
  }
  setPublicKey(value: Uint8Array | string): void {
    jspb.Message.setField(this, 2, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    HiveSignedMessage.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(): object {
    return { signature: this.getSignature(), publicKey: this.getPublicKey() };
  }
  static toObject(_: boolean, msg: HiveSignedMessage): object {
    return msg.toObject();
  }

  static deserializeBinary(bytes: Uint8Array): HiveSignedMessage {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new HiveSignedMessage();
    return HiveSignedMessage.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: HiveSignedMessage, reader: jspb.BinaryReader): HiveSignedMessage {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1:
          msg.setSignature(reader.readBytes());
          break;
        case 2:
          msg.setPublicKey(reader.readBytes());
          break;
        default:
          reader.skipField();
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: HiveSignedMessage, writer: jspb.BinaryWriter): void {
    const sig = message.getSignature_asU8();
    if (sig.length > 0) writer.writeBytes(1, sig);
    const pk = message.getPublicKey_asU8();
    if (pk.length > 0) writer.writeBytes(2, pk);
  }
}

/**
 * HiveSignOperations: address_n(1, repeated uint32), chain_id(2, bytes 32),
 * serialized_tx(3, bytes max 2048). Firmware parses the Graphene bytes and
 * clear-signs recognized ops; digest = SHA256(chain_id || serialized_tx).
 */
export class HiveSignOperations extends jspb.Message {
  static repeatedFields_ = [1];

  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, HiveSignOperations.repeatedFields_, null);
  }

  getAddressNList(): number[] {
    return Msg.getRepeatedField(this, 1) as number[];
  }
  setAddressNList(value: number[]): void {
    jspb.Message.setField(this, 1, value || []);
  }

  getChainId(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 2, "") as Uint8Array | string;
  }
  getChainId_asU8(): Uint8Array {
    const val = this.getChainId();
    if (val instanceof Uint8Array) return val;
    return jspb.Message.bytesAsU8(val as string);
  }
  setChainId(value: Uint8Array | string): void {
    jspb.Message.setField(this, 2, value);
  }

  getSerializedTx(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 3, "") as Uint8Array | string;
  }
  getSerializedTx_asU8(): Uint8Array {
    const val = this.getSerializedTx();
    if (val instanceof Uint8Array) return val;
    return jspb.Message.bytesAsU8(val as string);
  }
  setSerializedTx(value: Uint8Array | string): void {
    jspb.Message.setField(this, 3, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    HiveSignOperations.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(): object {
    return { addressNList: this.getAddressNList(), chainId: this.getChainId(), serializedTx: this.getSerializedTx() };
  }
  static toObject(_: boolean, msg: HiveSignOperations): object {
    return msg.toObject();
  }

  static deserializeBinary(bytes: Uint8Array): HiveSignOperations {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new HiveSignOperations();
    return HiveSignOperations.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: HiveSignOperations, reader: jspb.BinaryReader): HiveSignOperations {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1:
          msg.setAddressNList(reader.readPackedUint32());
          break;
        case 2:
          msg.setChainId(reader.readBytes());
          break;
        case 3:
          msg.setSerializedTx(reader.readBytes());
          break;
        default:
          reader.skipField();
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: HiveSignOperations, writer: jspb.BinaryWriter): void {
    const path = message.getAddressNList();
    if (path.length > 0) writer.writeRepeatedUint32(1, path);
    const cid = message.getChainId_asU8();
    if (cid.length > 0) writer.writeBytes(2, cid);
    const tx = message.getSerializedTx_asU8();
    if (tx.length > 0) writer.writeBytes(3, tx);
  }
}

/**
 * HiveSignedOperations: signature(1, bytes 65)
 */
export class HiveSignedOperations extends jspb.Message {
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
  setSignature(value: Uint8Array | string): void {
    jspb.Message.setField(this, 1, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    HiveSignedOperations.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(): object {
    return { signature: this.getSignature() };
  }
  static toObject(_: boolean, msg: HiveSignedOperations): object {
    return msg.toObject();
  }

  static deserializeBinary(bytes: Uint8Array): HiveSignedOperations {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new HiveSignedOperations();
    return HiveSignedOperations.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: HiveSignedOperations, reader: jspb.BinaryReader): HiveSignedOperations {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1:
          msg.setSignature(reader.readBytes());
          break;
        default:
          reader.skipField();
      }
    }
    return msg;
  }

  static serializeBinaryToWriter(message: HiveSignedOperations, writer: jspb.BinaryWriter): void {
    const sig = message.getSignature_asU8();
    if (sig.length > 0) writer.writeBytes(1, sig);
  }
}

// ── Runtime Registration ───────────────────────────────────────────────

function registerHiveMessages() {
  const mt = Messages.MessageType as unknown as Record<string, number>;
  mt["MESSAGETYPE_HIVEGETPUBLICKEY"] = MESSAGETYPE_HIVEGETPUBLICKEY;
  mt["MESSAGETYPE_HIVEPUBLICKEY"] = MESSAGETYPE_HIVEPUBLICKEY;
  mt["MESSAGETYPE_HIVESIGNTX"] = MESSAGETYPE_HIVESIGNTX;
  mt["MESSAGETYPE_HIVESIGNEDTX"] = MESSAGETYPE_HIVESIGNEDTX;
  mt["MESSAGETYPE_HIVEGETPUBLICKEYS"] = MESSAGETYPE_HIVEGETPUBLICKEYS;
  mt["MESSAGETYPE_HIVEPUBLICKEYS"] = MESSAGETYPE_HIVEPUBLICKEYS;
  mt["MESSAGETYPE_HIVESIGNACCOUNTCREATE"] = MESSAGETYPE_HIVESIGNACCOUNTCREATE;
  mt["MESSAGETYPE_HIVESIGNEDACCOUNTCREATE"] = MESSAGETYPE_HIVESIGNEDACCOUNTCREATE;
  mt["MESSAGETYPE_HIVESIGNACCOUNTUPDATE"] = MESSAGETYPE_HIVESIGNACCOUNTUPDATE;
  mt["MESSAGETYPE_HIVESIGNEDACCOUNTUPDATE"] = MESSAGETYPE_HIVESIGNEDACCOUNTUPDATE;
  mt["MESSAGETYPE_HIVESIGNMESSAGE"] = MESSAGETYPE_HIVESIGNMESSAGE;
  mt["MESSAGETYPE_HIVESIGNEDMESSAGE"] = MESSAGETYPE_HIVESIGNEDMESSAGE;
  mt["MESSAGETYPE_HIVESIGNOPERATIONS"] = MESSAGETYPE_HIVESIGNOPERATIONS;
  mt["MESSAGETYPE_HIVESIGNEDOPERATIONS"] = MESSAGETYPE_HIVESIGNEDOPERATIONS;

  messageNameRegistry[MESSAGETYPE_HIVEGETPUBLICKEY] = "HiveGetPublicKey";
  messageNameRegistry[MESSAGETYPE_HIVEPUBLICKEY] = "HivePublicKey";
  messageNameRegistry[MESSAGETYPE_HIVESIGNTX] = "HiveSignTx";
  messageNameRegistry[MESSAGETYPE_HIVESIGNEDTX] = "HiveSignedTx";
  messageNameRegistry[MESSAGETYPE_HIVEGETPUBLICKEYS] = "HiveGetPublicKeys";
  messageNameRegistry[MESSAGETYPE_HIVEPUBLICKEYS] = "HivePublicKeys";
  messageNameRegistry[MESSAGETYPE_HIVESIGNACCOUNTCREATE] = "HiveSignAccountCreate";
  messageNameRegistry[MESSAGETYPE_HIVESIGNEDACCOUNTCREATE] = "HiveSignedAccountCreate";
  messageNameRegistry[MESSAGETYPE_HIVESIGNACCOUNTUPDATE] = "HiveSignAccountUpdate";
  messageNameRegistry[MESSAGETYPE_HIVESIGNEDACCOUNTUPDATE] = "HiveSignedAccountUpdate";
  messageNameRegistry[MESSAGETYPE_HIVESIGNMESSAGE] = "HiveSignMessage";
  messageNameRegistry[MESSAGETYPE_HIVESIGNEDMESSAGE] = "HiveSignedMessage";
  messageNameRegistry[MESSAGETYPE_HIVESIGNOPERATIONS] = "HiveSignOperations";
  messageNameRegistry[MESSAGETYPE_HIVESIGNEDOPERATIONS] = "HiveSignedOperations";

  messageTypeRegistry[MESSAGETYPE_HIVEGETPUBLICKEY] = HiveGetPublicKey as any;
  messageTypeRegistry[MESSAGETYPE_HIVEPUBLICKEY] = HivePublicKey as any;
  messageTypeRegistry[MESSAGETYPE_HIVESIGNTX] = HiveSignTx as any;
  messageTypeRegistry[MESSAGETYPE_HIVESIGNEDTX] = HiveSignedTx as any;
  messageTypeRegistry[MESSAGETYPE_HIVEGETPUBLICKEYS] = HiveGetPublicKeys as any;
  messageTypeRegistry[MESSAGETYPE_HIVEPUBLICKEYS] = HivePublicKeys as any;
  messageTypeRegistry[MESSAGETYPE_HIVESIGNACCOUNTCREATE] = HiveSignAccountCreate as any;
  messageTypeRegistry[MESSAGETYPE_HIVESIGNEDACCOUNTCREATE] = HiveSignedAccountCreate as any;
  messageTypeRegistry[MESSAGETYPE_HIVESIGNACCOUNTUPDATE] = HiveSignAccountUpdate as any;
  messageTypeRegistry[MESSAGETYPE_HIVESIGNEDACCOUNTUPDATE] = HiveSignedAccountUpdate as any;
  messageTypeRegistry[MESSAGETYPE_HIVESIGNMESSAGE] = HiveSignMessage as any;
  messageTypeRegistry[MESSAGETYPE_HIVESIGNEDMESSAGE] = HiveSignedMessage as any;
  messageTypeRegistry[MESSAGETYPE_HIVESIGNOPERATIONS] = HiveSignOperations as any;
  messageTypeRegistry[MESSAGETYPE_HIVESIGNEDOPERATIONS] = HiveSignedOperations as any;
}

registerHiveMessages();

// ── Wallet Methods ─────────────────────────────────────────────────────

export async function hiveGetPublicKey(transport: Transport, msg: core.HiveGetPublicKey): Promise<core.HivePublicKey> {
  const req = new HiveGetPublicKey();
  req.setAddressNList(msg.addressNList);
  if (msg.showDisplay !== undefined) req.setShowDisplay(msg.showDisplay);

  const response = await transport.call(MESSAGETYPE_HIVEGETPUBLICKEY, req, {
    msgTimeout: core.LONG_TIMEOUT,
  });

  const resp = response.proto as HivePublicKey;
  return {
    publicKey: core.mustBeDefined(resp.getPublicKey()),
    rawPublicKey: resp.getRawPublicKey_asU8(),
  };
}

export async function hiveSignTx(transport: Transport, msg: core.HiveSignTx): Promise<core.HiveSignedTx> {
  return transport.lockDuring(async () => {
    const req = new HiveSignTx();
    req.setAddressNList(msg.addressNList);

    if (msg.chainId !== undefined) {
      let chainIdBytes: Uint8Array;
      if (msg.chainId instanceof Uint8Array) {
        chainIdBytes = msg.chainId;
      } else if (typeof msg.chainId === "string") {
        chainIdBytes = core.fromHexString(msg.chainId);
      } else {
        chainIdBytes = new Uint8Array(msg.chainId as any);
      }
      req.setChainId(chainIdBytes);
    }

    req.setRefBlockNum(msg.refBlockNum);
    req.setRefBlockPrefix(msg.refBlockPrefix);
    req.setExpiration(msg.expiration);
    req.setFrom(msg.from);
    req.setTo(msg.to);
    req.setAmount(msg.amount);
    if (msg.decimals !== undefined) req.setDecimals(msg.decimals);
    req.setAssetSymbol(msg.assetSymbol);
    if (msg.memo !== undefined) req.setMemo(msg.memo);

    const resp = await transport.call(MESSAGETYPE_HIVESIGNTX, req, {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });

    if (resp.message_enum !== MESSAGETYPE_HIVESIGNEDTX) {
      throw new Error(`hive: unexpected response ${resp.message_type}`);
    }

    const signedTx = resp.proto as HiveSignedTx;
    return {
      signature: signedTx.getSignature_asU8(),
      serializedTx: signedTx.getSerializedTx_asU8(),
    };
  });
}

export async function hiveSignMessage(
  transport: Transport,
  msg: core.HiveSignMessage
): Promise<core.HiveSignedMessage> {
  return transport.lockDuring(async () => {
    const req = new HiveSignMessage();
    req.setAddressNList(msg.addressNList);
    req.setMessage(msg.message);

    const resp = await transport.call(MESSAGETYPE_HIVESIGNMESSAGE, req, {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });

    if (resp.message_enum !== MESSAGETYPE_HIVESIGNEDMESSAGE) {
      throw new Error(`hive: unexpected response ${resp.message_type}`);
    }

    const signed = resp.proto as HiveSignedMessage;
    return {
      signature: signed.getSignature_asU8(),
      publicKey: signed.getPublicKey_asU8(),
    };
  });
}

function toChainIdBytes(chainId: Uint8Array | string): Uint8Array {
  if (chainId instanceof Uint8Array) return chainId;
  if (typeof chainId === "string") return core.fromHexString(chainId);
  return new Uint8Array(chainId as any);
}

export async function hiveSignOperations(
  transport: Transport,
  msg: core.HiveSignOperations
): Promise<core.HiveSignedOperations> {
  return transport.lockDuring(async () => {
    const req = new HiveSignOperations();
    req.setAddressNList(msg.addressNList);
    if (msg.chainId !== undefined) req.setChainId(toChainIdBytes(msg.chainId));
    req.setSerializedTx(msg.serializedTx);

    const resp = await transport.call(MESSAGETYPE_HIVESIGNOPERATIONS, req, {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });

    if (resp.message_enum !== MESSAGETYPE_HIVESIGNEDOPERATIONS) {
      throw new Error(`hive: unexpected response ${resp.message_type}`);
    }

    const signed = resp.proto as HiveSignedOperations;
    return { signature: signed.getSignature_asU8() };
  });
}

export async function hiveGetPublicKeys(
  transport: Transport,
  msg: core.HiveGetPublicKeys
): Promise<core.HivePublicKeys> {
  const req = new HiveGetPublicKeys();
  if (msg.accountIndex !== undefined) req.setAccountIndex(msg.accountIndex);
  if (msg.showDisplay !== undefined) req.setShowDisplay(msg.showDisplay);

  const response = await transport.call(MESSAGETYPE_HIVEGETPUBLICKEYS, req, {
    msgTimeout: core.LONG_TIMEOUT,
  });

  if (response.message_enum !== MESSAGETYPE_HIVEPUBLICKEYS) {
    throw new Error(`hive: unexpected response ${response.message_type}`);
  }
  const resp = response.proto as HivePublicKeys;
  return {
    ownerKey: core.mustBeDefined(resp.getOwnerKey()),
    activeKey: core.mustBeDefined(resp.getActiveKey()),
    memoKey: core.mustBeDefined(resp.getMemoKey()),
    postingKey: core.mustBeDefined(resp.getPostingKey()),
  };
}

export async function hiveSignAccountCreate(
  transport: Transport,
  msg: core.HiveSignAccountCreate
): Promise<core.HiveSignedAccountCreate> {
  return transport.lockDuring(async () => {
    const req = new HiveSignAccountCreate();
    req.setAddressNList(msg.addressNList);
    if (msg.chainId !== undefined) req.setChainId(toChainIdBytes(msg.chainId));
    req.setRefBlockNum(msg.refBlockNum);
    req.setRefBlockPrefix(msg.refBlockPrefix);
    req.setExpiration(msg.expiration);
    req.setCreator(msg.creator);
    req.setNewAccountName(msg.newAccountName);
    req.setOwnerKey(msg.ownerKey);
    req.setActiveKey(msg.activeKey);
    req.setPostingKey(msg.postingKey);
    req.setMemoKey(msg.memoKey);
    req.setFeeAmount(msg.feeAmount);

    const resp = await transport.call(MESSAGETYPE_HIVESIGNACCOUNTCREATE, req, {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });

    if (resp.message_enum !== MESSAGETYPE_HIVESIGNEDACCOUNTCREATE) {
      throw new Error(`hive: unexpected response ${resp.message_type}`);
    }
    const signed = resp.proto as HiveSignedAccountCreate;
    return {
      signature: signed.getSignature_asU8(),
      serializedTx: signed.getSerializedTx_asU8(),
    };
  });
}

export async function hiveSignAccountUpdate(
  transport: Transport,
  msg: core.HiveSignAccountUpdate
): Promise<core.HiveSignedAccountUpdate> {
  return transport.lockDuring(async () => {
    const req = new HiveSignAccountUpdate();
    req.setAddressNList(msg.addressNList);
    if (msg.chainId !== undefined) req.setChainId(toChainIdBytes(msg.chainId));
    req.setRefBlockNum(msg.refBlockNum);
    req.setRefBlockPrefix(msg.refBlockPrefix);
    req.setExpiration(msg.expiration);
    req.setAccount(msg.account);
    req.setNewOwnerKey(msg.newOwnerKey);
    req.setNewActiveKey(msg.newActiveKey);
    req.setNewPostingKey(msg.newPostingKey);
    req.setNewMemoKey(msg.newMemoKey);

    const resp = await transport.call(MESSAGETYPE_HIVESIGNACCOUNTUPDATE, req, {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });

    if (resp.message_enum !== MESSAGETYPE_HIVESIGNEDACCOUNTUPDATE) {
      throw new Error(`hive: unexpected response ${resp.message_type}`);
    }
    const signed = resp.proto as HiveSignedAccountUpdate;
    return {
      signature: signed.getSignature_asU8(),
      serializedTx: signed.getSerializedTx_asU8(),
    };
  });
}

import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as core from "@keepkey/hdwallet-core";
import * as jspb from "google-protobuf";

import { Transport } from "./transport";
import { messageNameRegistry, messageTypeRegistry } from "./typeRegistry";

const Msg = jspb.Message as any;

// ── Hive Message Type IDs (messages-hive.proto, wire IDs 1600–1603) ───
const MESSAGETYPE_HIVEGETPUBLICKEY = 1600;
const MESSAGETYPE_HIVEPUBLICKEY    = 1601;
const MESSAGETYPE_HIVESIGNTX       = 1602;
const MESSAGETYPE_HIVESIGNEDTX     = 1603;

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

  getAddressNList(): number[] { return Msg.getRepeatedField(this, 1) as number[]; }
  setAddressNList(value: number[]): void { jspb.Message.setField(this, 1, value || []); }
  addAddressN(value: number): void { jspb.Message.addToRepeatedField(this, 1, value); }

  getShowDisplay(): boolean | undefined {
    const f = jspb.Message.getField(this, 2);
    return f == null ? undefined : !!f;
  }
  setShowDisplay(value: boolean): void { jspb.Message.setField(this, 2, value ? 1 : 0); }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    HiveGetPublicKey.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(): object { return { addressNList: this.getAddressNList(), showDisplay: this.getShowDisplay() }; }
  static toObject(_: boolean, msg: HiveGetPublicKey): object { return msg.toObject(); }

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
        case 2: msg.setShowDisplay(reader.readBool()); break;
        default: reader.skipField();
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

  getPublicKey(): string | undefined { return jspb.Message.getFieldWithDefault(this, 1, "") as string; }
  setPublicKey(value: string): void { jspb.Message.setField(this, 1, value); }

  getRawPublicKey(): Uint8Array | string { return jspb.Message.getFieldWithDefault(this, 2, "") as Uint8Array | string; }
  getRawPublicKey_asU8(): Uint8Array {
    const val = this.getRawPublicKey();
    if (val instanceof Uint8Array) return val;
    return jspb.Message.bytesAsU8(val as string);
  }
  setRawPublicKey(value: Uint8Array | string): void { jspb.Message.setField(this, 2, value); }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    HivePublicKey.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(): object { return { publicKey: this.getPublicKey(), rawPublicKey: this.getRawPublicKey() }; }
  static toObject(_: boolean, msg: HivePublicKey): object { return msg.toObject(); }

  static deserializeBinary(bytes: Uint8Array): HivePublicKey {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new HivePublicKey();
    return HivePublicKey.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: HivePublicKey, reader: jspb.BinaryReader): HivePublicKey {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1: msg.setPublicKey(reader.readString()); break;
        case 2: msg.setRawPublicKey(reader.readBytes()); break;
        default: reader.skipField();
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

  getAddressNList(): number[] { return Msg.getRepeatedField(this, 1) as number[]; }
  setAddressNList(value: number[]): void { jspb.Message.setField(this, 1, value || []); }
  addAddressN(value: number): void { jspb.Message.addToRepeatedField(this, 1, value); }

  getChainId(): Uint8Array | string { return jspb.Message.getFieldWithDefault(this, 2, "") as Uint8Array | string; }
  getChainId_asU8(): Uint8Array {
    const val = this.getChainId();
    if (val instanceof Uint8Array) return val;
    return jspb.Message.bytesAsU8(val as string);
  }
  setChainId(value: Uint8Array | string): void { jspb.Message.setField(this, 2, value); }

  getRefBlockNum(): number { return jspb.Message.getFieldWithDefault(this, 3, 0) as number; }
  setRefBlockNum(value: number): void { jspb.Message.setField(this, 3, value); }

  getRefBlockPrefix(): number { return jspb.Message.getFieldWithDefault(this, 4, 0) as number; }
  setRefBlockPrefix(value: number): void { jspb.Message.setField(this, 4, value); }

  getExpiration(): number { return jspb.Message.getFieldWithDefault(this, 5, 0) as number; }
  setExpiration(value: number): void { jspb.Message.setField(this, 5, value); }

  getFrom(): string { return jspb.Message.getFieldWithDefault(this, 6, "") as string; }
  setFrom(value: string): void { jspb.Message.setField(this, 6, value); }

  getTo(): string { return jspb.Message.getFieldWithDefault(this, 7, "") as string; }
  setTo(value: string): void { jspb.Message.setField(this, 7, value); }

  getAmount(): number { return jspb.Message.getFieldWithDefault(this, 8, 0) as number; }
  setAmount(value: number): void { jspb.Message.setField(this, 8, value); }

  getDecimals(): number { return jspb.Message.getFieldWithDefault(this, 9, 3) as number; }
  setDecimals(value: number): void { jspb.Message.setField(this, 9, value); }

  getAssetSymbol(): string { return jspb.Message.getFieldWithDefault(this, 10, "") as string; }
  setAssetSymbol(value: string): void { jspb.Message.setField(this, 10, value); }

  getMemo(): string | undefined { return jspb.Message.getFieldWithDefault(this, 11, "") as string; }
  setMemo(value: string): void { jspb.Message.setField(this, 11, value); }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    HiveSignTx.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(): object {
    return {
      addressNList: this.getAddressNList(), chainId: this.getChainId(),
      refBlockNum: this.getRefBlockNum(), refBlockPrefix: this.getRefBlockPrefix(),
      expiration: this.getExpiration(), from: this.getFrom(), to: this.getTo(),
      amount: this.getAmount(), decimals: this.getDecimals(),
      assetSymbol: this.getAssetSymbol(), memo: this.getMemo(),
    };
  }
  static toObject(_: boolean, msg: HiveSignTx): object { return msg.toObject(); }

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
        case 2: msg.setChainId(reader.readBytes()); break;
        case 3: msg.setRefBlockNum(reader.readUint32()); break;
        case 4: msg.setRefBlockPrefix(reader.readUint32()); break;
        case 5: msg.setExpiration(reader.readUint32()); break;
        case 6: msg.setFrom(reader.readString()); break;
        case 7: msg.setTo(reader.readString()); break;
        case 8: msg.setAmount(reader.readUint64()); break;
        case 9: msg.setDecimals(reader.readUint32()); break;
        case 10: msg.setAssetSymbol(reader.readString()); break;
        case 11: msg.setMemo(reader.readString()); break;
        default: reader.skipField();
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

  getSignature(): Uint8Array | string { return jspb.Message.getFieldWithDefault(this, 1, "") as Uint8Array | string; }
  getSignature_asU8(): Uint8Array {
    const val = this.getSignature();
    if (val instanceof Uint8Array) return val;
    return jspb.Message.bytesAsU8(val as string);
  }
  setSignature(value: Uint8Array | string): void { jspb.Message.setField(this, 1, value); }

  getSerializedTx(): Uint8Array | string { return jspb.Message.getFieldWithDefault(this, 2, "") as Uint8Array | string; }
  getSerializedTx_asU8(): Uint8Array {
    const val = this.getSerializedTx();
    if (val instanceof Uint8Array) return val;
    return jspb.Message.bytesAsU8(val as string);
  }
  setSerializedTx(value: Uint8Array | string): void { jspb.Message.setField(this, 2, value); }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    HiveSignedTx.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }

  toObject(): object { return { signature: this.getSignature(), serializedTx: this.getSerializedTx() }; }
  static toObject(_: boolean, msg: HiveSignedTx): object { return msg.toObject(); }

  static deserializeBinary(bytes: Uint8Array): HiveSignedTx {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new HiveSignedTx();
    return HiveSignedTx.deserializeBinaryFromReader(msg, reader);
  }

  static deserializeBinaryFromReader(msg: HiveSignedTx, reader: jspb.BinaryReader): HiveSignedTx {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1: msg.setSignature(reader.readBytes()); break;
        case 2: msg.setSerializedTx(reader.readBytes()); break;
        default: reader.skipField();
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

// ── Runtime Registration ───────────────────────────────────────────────

function registerHiveMessages() {
  const mt = Messages.MessageType as unknown as Record<string, number>;
  mt["MESSAGETYPE_HIVEGETPUBLICKEY"] = MESSAGETYPE_HIVEGETPUBLICKEY;
  mt["MESSAGETYPE_HIVEPUBLICKEY"]    = MESSAGETYPE_HIVEPUBLICKEY;
  mt["MESSAGETYPE_HIVESIGNTX"]       = MESSAGETYPE_HIVESIGNTX;
  mt["MESSAGETYPE_HIVESIGNEDTX"]     = MESSAGETYPE_HIVESIGNEDTX;

  messageNameRegistry[MESSAGETYPE_HIVEGETPUBLICKEY] = "HiveGetPublicKey";
  messageNameRegistry[MESSAGETYPE_HIVEPUBLICKEY]    = "HivePublicKey";
  messageNameRegistry[MESSAGETYPE_HIVESIGNTX]       = "HiveSignTx";
  messageNameRegistry[MESSAGETYPE_HIVESIGNEDTX]     = "HiveSignedTx";

  messageTypeRegistry[MESSAGETYPE_HIVEGETPUBLICKEY] = HiveGetPublicKey as any;
  messageTypeRegistry[MESSAGETYPE_HIVEPUBLICKEY]    = HivePublicKey as any;
  messageTypeRegistry[MESSAGETYPE_HIVESIGNTX]       = HiveSignTx as any;
  messageTypeRegistry[MESSAGETYPE_HIVESIGNEDTX]     = HiveSignedTx as any;
}

registerHiveMessages();

// ── Wallet Methods ─────────────────────────────────────────────────────

export async function hiveGetPublicKey(
  transport: Transport,
  msg: core.HiveGetPublicKey,
): Promise<core.HivePublicKey> {
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

export async function hiveSignTx(
  transport: Transport,
  msg: core.HiveSignTx,
): Promise<core.HiveSignedTx> {
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

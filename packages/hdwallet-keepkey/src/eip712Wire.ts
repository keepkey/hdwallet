import * as jspb from "google-protobuf";

import { EthereumDataType, FieldType } from "./eip712Streaming";

/**
 * Wire messages for structured EIP-712, hand-written because they are not yet
 * in the published @keepkey/device-protocol package. Same approach as
 * LoadClearsignSigner in ethereum.ts, and they can be deleted the day the
 * package ships the generated classes.
 *
 * Message type IDs and field numbers are from device-protocol
 * messages-ethereum.proto and messages.proto.
 */
export const MESSAGETYPE_ETHEREUMSIGNTYPEDDATA = 1704;
export const MESSAGETYPE_ETHEREUMTYPEDDATASTRUCTREQUEST = 1705;
export const MESSAGETYPE_ETHEREUMTYPEDDATASTRUCTACK = 1706;
export const MESSAGETYPE_ETHEREUMTYPEDDATAVALUEREQUEST = 1707;
export const MESSAGETYPE_ETHEREUMTYPEDDATAVALUEACK = 1708;

/** message EthereumSignTypedData { repeated uint32 address_n = 1; required string primary_type = 2; optional bool metamask_v4_compat = 3; } */
export class EthereumSignTypedData extends jspb.Message {
  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, null, null);
  }
  setAddressNList(value: number[]): void {
    jspb.Message.setField(this, 1, value);
  }
  setPrimaryType(value: string): void {
    jspb.Message.setField(this, 2, value);
  }
  setMetamaskV4Compat(value: boolean): void {
    jspb.Message.setField(this, 3, value);
  }
  toObject(): Record<string, never> {
    // Required by jspb.Message. Nothing on this path introspects these
    // messages; the transport serialises them and reads the reply.
    return {};
  }
  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    EthereumSignTypedData.serializeBinaryToWriter(this, writer);
    return writer.getResultBuffer();
  }
  static serializeBinaryToWriter(m: EthereumSignTypedData, writer: jspb.BinaryWriter): void {
    writer.writeRepeatedUint32(1, jspb.Message.getFieldWithDefault(m, 1, []) as number[]);
    writer.writeString(2, jspb.Message.getFieldWithDefault(m, 2, "") as string);
    writer.writeBool(3, jspb.Message.getFieldWithDefault(m, 3, true) as boolean);
  }
  static deserializeBinary(bytes: Uint8Array): EthereumSignTypedData {
    return new EthereumSignTypedData(bytes);
  }
}

/** message EthereumTypedDataStructRequest { required string name = 1; } */
export class EthereumTypedDataStructRequest extends jspb.Message {
  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, null, null);
  }
  getName(): string {
    return jspb.Message.getFieldWithDefault(this, 1, "") as string;
  }
  toObject(): Record<string, never> {
    // Required by jspb.Message. Nothing on this path introspects these
    // messages; the transport serialises them and reads the reply.
    return {};
  }
  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    writer.writeString(1, this.getName());
    return writer.getResultBuffer();
  }
  static deserializeBinary(bytes: Uint8Array): EthereumTypedDataStructRequest {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new EthereumTypedDataStructRequest();
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      if (reader.getFieldNumber() === 1) jspb.Message.setField(msg, 1, reader.readString());
      else reader.skipField();
    }
    return msg;
  }
}

/** message EthereumTypedDataValueRequest { repeated uint32 member_path = 1; } */
export class EthereumTypedDataValueRequest extends jspb.Message {
  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, [1], null);
  }
  getMemberPathList(): number[] {
    return (jspb.Message.getField(this, 1) as number[]) || [];
  }
  toObject(): Record<string, never> {
    // Required by jspb.Message. Nothing on this path introspects these
    // messages; the transport serialises them and reads the reply.
    return {};
  }
  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    writer.writeRepeatedUint32(1, this.getMemberPathList());
    return writer.getResultBuffer();
  }
  static deserializeBinary(bytes: Uint8Array): EthereumTypedDataValueRequest {
    const reader = new jspb.BinaryReader(bytes);
    const msg = new EthereumTypedDataValueRequest();
    const path: number[] = [];
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      if (reader.getFieldNumber() === 1) {
        // A repeated uint32 may arrive packed or unpacked; accept both rather
        // than assuming, because the device's encoder is not ours to pin.
        if (reader.isDelimited()) path.push(...reader.readPackedUint32());
        else path.push(reader.readUint32());
      } else reader.skipField();
    }
    jspb.Message.setField(msg, 1, path);
    return msg;
  }
}

/** message EthereumTypedDataValueAck { required bytes value = 1; } */
export class EthereumTypedDataValueAck extends jspb.Message {
  constructor(opt_data?: any) {
    super();
    jspb.Message.initialize(this, opt_data || [], 0, -1, null, null);
  }
  setValue(value: Uint8Array): void {
    jspb.Message.setField(this, 1, value);
  }
  toObject(): Record<string, never> {
    // Required by jspb.Message. Nothing on this path introspects these
    // messages; the transport serialises them and reads the reply.
    return {};
  }
  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    writer.writeBytes(1, jspb.Message.getFieldWithDefault(this, 1, new Uint8Array()) as Uint8Array);
    return writer.getResultBuffer();
  }
  static deserializeBinary(bytes: Uint8Array): EthereumTypedDataValueAck {
    return new EthereumTypedDataValueAck(bytes);
  }
}

/**
 * message EthereumTypedDataStructAck {
 *   repeated EthereumStructMember members = 1;
 *   message EthereumStructMember { required EthereumFieldType type = 1; required string name = 2; }
 *   message EthereumFieldType {
 *     required EthereumDataType data_type = 1;
 *     optional uint32 size = 2;
 *     optional string struct_name = 3;
 *     repeated uint32 array_levels = 4;
 *   }
 * }
 *
 * Written by hand as nested submessages rather than via jspb's message
 * machinery: the shape is small and fixed, and doing the length-delimited
 * framing explicitly is easier to check against the .proto than a generated
 * wrapper would be.
 */
export class EthereumTypedDataStructAck extends jspb.Message {
  private members: Array<{ name: string; type: FieldType }> = [];

  constructor(members: Array<{ name: string; type: FieldType }> = []) {
    super();
    jspb.Message.initialize(this, [], 0, -1, null, null);
    this.members = members;
  }

  private static writeFieldType(t: FieldType, writer: jspb.BinaryWriter): void {
    writer.writeEnum(1, t.dataType);
    if (t.size !== undefined) writer.writeUint32(2, t.size);
    if (t.structName !== undefined) writer.writeString(3, t.structName);
    if (t.arrayLevels.length > 0) writer.writeRepeatedUint32(4, t.arrayLevels);
  }

  toObject(): Record<string, never> {
    // Required by jspb.Message. Nothing on this path introspects these
    // messages; the transport serialises them and reads the reply.
    return {};
  }
  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    for (const m of this.members) {
      writer.writeMessage(1, m, (_unused: unknown, w: jspb.BinaryWriter) => {
        w.writeMessage(1, m.type, (_u: unknown, tw: jspb.BinaryWriter) => {
          EthereumTypedDataStructAck.writeFieldType(m.type, tw);
        });
        w.writeString(2, m.name);
      });
    }
    return writer.getResultBuffer();
  }

  /* Host to device only. The device never sends a StructAck, so there is
   * nothing to parse -- but jspb's shape expects the static to exist. */
  static deserializeBinary(_bytes: Uint8Array): EthereumTypedDataStructAck {
    return new EthereumTypedDataStructAck();
  }
}

export { EthereumDataType };

/**
 * A message that is already serialised. transport.call wants a jspb.Message,
 * and the walk produces bytes, so this carries them across without a second
 * encode that could differ from the first.
 */
export class RawPayload extends jspb.Message {
  private raw: Uint8Array;
  constructor(bytes: Uint8Array) {
    super();
    jspb.Message.initialize(this, [], 0, -1, null, null);
    this.raw = bytes;
  }
  toObject(): Record<string, never> {
    return {};
  }
  serializeBinary(): Uint8Array {
    return this.raw;
  }
  static deserializeBinary(bytes: Uint8Array): RawPayload {
    return new RawPayload(bytes);
  }
}

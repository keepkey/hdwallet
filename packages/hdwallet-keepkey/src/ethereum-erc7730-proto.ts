import * as jspb from "google-protobuf";

function bytesAsU8(value: Uint8Array | string): Uint8Array {
  return value instanceof Uint8Array ? value : jspb.Message.bytesAsU8(value);
}

abstract class DefinitionFields extends jspb.Message {
  getDefinitionId(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 1, "") as Uint8Array | string;
  }
  getDefinitionId_asU8(): Uint8Array {
    return bytesAsU8(this.getDefinitionId());
  }
  setDefinitionId(value: Uint8Array | string): void {
    jspb.Message.setField(this, 1, value);
  }
  getOffset(): number {
    return jspb.Message.getFieldWithDefault(this, 2, 0) as number;
  }
  setOffset(value: number): void {
    jspb.Message.setField(this, 2, value);
  }
  getTotalLength(): number {
    return jspb.Message.getFieldWithDefault(this, 3, 0) as number;
  }
  setTotalLength(value: number): void {
    jspb.Message.setField(this, 3, value);
  }
  getData(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 4, "") as Uint8Array | string;
  }
  getData_asU8(): Uint8Array {
    return bytesAsU8(this.getData());
  }
  setData(value: Uint8Array | string): void {
    jspb.Message.setField(this, 4, value);
  }
  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    writer.writeBytes(1, this.getDefinitionId());
    writer.writeUint32(2, this.getOffset());
    writer.writeUint32(3, this.getTotalLength());
    writer.writeBytes(4, this.getData());
    return writer.getResultBuffer();
  }
  toObject() {
    return {
      definitionId: this.getDefinitionId(),
      offset: this.getOffset(),
      totalLength: this.getTotalLength(),
      data: this.getData(),
    };
  }
}

export class EthereumClearSignDefinition extends DefinitionFields {
  constructor(data?: any) {
    super();
    jspb.Message.initialize(this, data || [], 0, -1, null, null);
  }
}

export class EthereumClearSignDefinitionChunk extends DefinitionFields {
  constructor(data?: any) {
    super();
    jspb.Message.initialize(this, data || [], 0, -1, null, null);
  }
}

export class EthereumClearSignDefinitionAck extends jspb.Message {
  constructor(data?: any) {
    super();
    jspb.Message.initialize(this, data || [], 0, -1, null, null);
  }
  getDefinitionId(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 1, "") as Uint8Array | string;
  }
  getDefinitionId_asU8(): Uint8Array {
    return bytesAsU8(this.getDefinitionId());
  }
  setDefinitionId(value: Uint8Array | string): void {
    jspb.Message.setField(this, 1, value);
  }
  getNextOffset(): number {
    return jspb.Message.getFieldWithDefault(this, 2, 0) as number;
  }
  setNextOffset(value: number): void {
    jspb.Message.setField(this, 2, value);
  }
  getComplete(): boolean {
    return jspb.Message.getFieldWithDefault(this, 3, false) as boolean;
  }
  setComplete(value: boolean): void {
    jspb.Message.setField(this, 3, value);
  }
  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    writer.writeBytes(1, this.getDefinitionId());
    writer.writeUint32(2, this.getNextOffset());
    writer.writeBool(3, this.getComplete());
    return writer.getResultBuffer();
  }
  static deserializeBinaryFromReader(
    msg: EthereumClearSignDefinitionAck,
    reader: jspb.BinaryReader
  ): EthereumClearSignDefinitionAck {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1:
          msg.setDefinitionId(reader.readBytes());
          break;
        case 2:
          msg.setNextOffset(reader.readUint32());
          break;
        case 3:
          msg.setComplete(reader.readBool());
          break;
        default:
          reader.skipField();
      }
    }
    return msg;
  }
  toObject() {
    return { definitionId: this.getDefinitionId(), nextOffset: this.getNextOffset(), complete: this.getComplete() };
  }
}

export class EthereumClearSignDefinitionRequest extends jspb.Message {
  constructor(data?: any) {
    super();
    jspb.Message.initialize(this, data || [], 0, -1, null, null);
  }
  getKind(): number {
    return jspb.Message.getFieldWithDefault(this, 1, 0) as number;
  }
  setKind(value: number): void {
    jspb.Message.setField(this, 1, value);
  }
  getChainId(): number {
    return jspb.Message.getFieldWithDefault(this, 2, 0) as number;
  }
  setChainId(value: number): void {
    jspb.Message.setField(this, 2, value);
  }
  hasContractAddress(): boolean {
    return jspb.Message.getField(this, 3) != null;
  }
  getContractAddress_asU8(): Uint8Array {
    return bytesAsU8(jspb.Message.getFieldWithDefault(this, 3, "") as Uint8Array | string);
  }
  setContractAddress(value: Uint8Array | string): void {
    jspb.Message.setField(this, 3, value);
  }
  hasSelectorOrTypeHash(): boolean {
    return jspb.Message.getField(this, 4) != null;
  }
  getSelectorOrTypeHash_asU8(): Uint8Array {
    return bytesAsU8(jspb.Message.getFieldWithDefault(this, 4, "") as Uint8Array | string);
  }
  setSelectorOrTypeHash(value: Uint8Array | string): void {
    jspb.Message.setField(this, 4, value);
  }
  hasDefinitionId(): boolean {
    return jspb.Message.getField(this, 5) != null;
  }
  getDefinitionId_asU8(): Uint8Array {
    return bytesAsU8(jspb.Message.getFieldWithDefault(this, 5, "") as Uint8Array | string);
  }
  setDefinitionId(value: Uint8Array | string): void {
    jspb.Message.setField(this, 5, value);
  }
  getOffset(): number {
    return jspb.Message.getFieldWithDefault(this, 6, 0) as number;
  }
  setOffset(value: number): void {
    jspb.Message.setField(this, 6, value);
  }
  getLength(): number {
    return jspb.Message.getFieldWithDefault(this, 7, 0) as number;
  }
  setLength(value: number): void {
    jspb.Message.setField(this, 7, value);
  }
  hasRecursionDepth(): boolean {
    return jspb.Message.getField(this, 8) != null;
  }
  getRecursionDepth(): number {
    return jspb.Message.getFieldWithDefault(this, 8, 0) as number;
  }
  setRecursionDepth(value: number): void {
    jspb.Message.setField(this, 8, value);
  }
  serializeBinary(): Uint8Array {
    return new Uint8Array();
  }
  static deserializeBinaryFromReader(
    msg: EthereumClearSignDefinitionRequest,
    reader: jspb.BinaryReader
  ): EthereumClearSignDefinitionRequest {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      switch (reader.getFieldNumber()) {
        case 1:
          msg.setKind(reader.readEnum());
          break;
        case 2:
          msg.setChainId(reader.readUint64());
          break;
        case 3:
          msg.setContractAddress(reader.readBytes());
          break;
        case 4:
          msg.setSelectorOrTypeHash(reader.readBytes());
          break;
        case 5:
          msg.setDefinitionId(reader.readBytes());
          break;
        case 6:
          msg.setOffset(reader.readUint32());
          break;
        case 7:
          msg.setLength(reader.readUint32());
          break;
        case 8:
          msg.setRecursionDepth(reader.readUint32());
          break;
        default:
          reader.skipField();
      }
    }
    return msg;
  }
  toObject() {
    return {
      kind: this.getKind(),
      chainId: this.getChainId(),
      contractAddress: this.getContractAddress_asU8(),
      selectorOrTypeHash: this.getSelectorOrTypeHash_asU8(),
      definitionId: this.getDefinitionId_asU8(),
      offset: this.getOffset(),
      length: this.getLength(),
      recursionDepth: this.getRecursionDepth(),
    };
  }
}

export const EthereumClearSignDefinitionKind = {
  ERC7730_CALLDATA: 1,
  ERC7730_EIP712: 2,
  ERC7730_TOKEN: 3,
  ERC7730_NETWORK: 4,
} as const;

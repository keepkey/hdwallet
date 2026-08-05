import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as core from "@keepkey/hdwallet-core";
import * as jspb from "google-protobuf";

import { Transport } from "./transport";
import { messageNameRegistry, messageTypeRegistry } from "./typeRegistry";

const MESSAGETYPE_CLEARSIGN_ATTESTOR_GET_PUBLIC_KEY = 1700;
const MESSAGETYPE_CLEARSIGN_ATTESTOR_PUBLIC_KEY = 1701;
const MESSAGETYPE_CLEARSIGN_ATTESTOR_SIGN = 1702;
const MESSAGETYPE_CLEARSIGN_ATTESTOR_SIGNATURE = 1703;

class ClearsignAttestorGetPublicKeyShim extends jspb.Message {
  constructor(optData?: any) {
    super();
    jspb.Message.initialize(this, optData || [], 0, -1, null, null);
  }

  serializeBinary(): Uint8Array {
    return new jspb.BinaryWriter().getResultBuffer();
  }

  toObject(): object {
    return {};
  }

  static deserializeBinary(bytes: Uint8Array): ClearsignAttestorGetPublicKeyShim {
    return ClearsignAttestorGetPublicKeyShim.deserializeBinaryFromReader(
      new ClearsignAttestorGetPublicKeyShim(),
      new jspb.BinaryReader(bytes)
    );
  }

  static deserializeBinaryFromReader(
    message: ClearsignAttestorGetPublicKeyShim,
    reader: jspb.BinaryReader
  ): ClearsignAttestorGetPublicKeyShim {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      reader.skipField();
    }
    return message;
  }
}

class ClearsignAttestorPublicKeyShim extends jspb.Message {
  constructor(optData?: any) {
    super();
    jspb.Message.initialize(this, optData || [], 0, -1, null, null);
  }

  getPublicKey(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 1, "") as Uint8Array | string;
  }

  getPublicKey_asU8(): Uint8Array {
    const value = this.getPublicKey();
    return value instanceof Uint8Array ? value : jspb.Message.bytesAsU8(value);
  }

  setPublicKey(value: Uint8Array | string): void {
    jspb.Message.setField(this, 1, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    const value = this.getPublicKey();
    if (value && value.length > 0) writer.writeBytes(1, value);
    return writer.getResultBuffer();
  }

  toObject(): object {
    return { publicKey: this.getPublicKey() };
  }

  static deserializeBinary(bytes: Uint8Array): ClearsignAttestorPublicKeyShim {
    return ClearsignAttestorPublicKeyShim.deserializeBinaryFromReader(
      new ClearsignAttestorPublicKeyShim(),
      new jspb.BinaryReader(bytes)
    );
  }

  static deserializeBinaryFromReader(
    message: ClearsignAttestorPublicKeyShim,
    reader: jspb.BinaryReader
  ): ClearsignAttestorPublicKeyShim {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      if (reader.getFieldNumber() === 1) message.setPublicKey(reader.readBytes());
      else reader.skipField();
    }
    return message;
  }
}

class ClearsignAttestorSignShim extends jspb.Message {
  constructor(optData?: any) {
    super();
    jspb.Message.initialize(this, optData || [], 0, -1, null, null);
  }

  getPayload(): Uint8Array | string {
    return jspb.Message.getFieldWithDefault(this, 1, "") as Uint8Array | string;
  }

  getPayload_asU8(): Uint8Array {
    const value = this.getPayload();
    return value instanceof Uint8Array ? value : jspb.Message.bytesAsU8(value);
  }

  setPayload(value: Uint8Array | string): void {
    jspb.Message.setField(this, 1, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    const value = this.getPayload();
    if (value && value.length > 0) writer.writeBytes(1, value);
    return writer.getResultBuffer();
  }

  toObject(): object {
    return { payload: this.getPayload() };
  }

  static deserializeBinary(bytes: Uint8Array): ClearsignAttestorSignShim {
    return ClearsignAttestorSignShim.deserializeBinaryFromReader(
      new ClearsignAttestorSignShim(),
      new jspb.BinaryReader(bytes)
    );
  }

  static deserializeBinaryFromReader(
    message: ClearsignAttestorSignShim,
    reader: jspb.BinaryReader
  ): ClearsignAttestorSignShim {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      if (reader.getFieldNumber() === 1) message.setPayload(reader.readBytes());
      else reader.skipField();
    }
    return message;
  }
}

class ClearsignAttestorSignatureShim extends jspb.Message {
  constructor(optData?: any) {
    super();
    jspb.Message.initialize(this, optData || [], 0, -1, null, null);
  }

  private getBytes(field: number): Uint8Array {
    const value = jspb.Message.getFieldWithDefault(this, field, "") as Uint8Array | string;
    return value instanceof Uint8Array ? value : jspb.Message.bytesAsU8(value);
  }

  getSignature_asU8(): Uint8Array {
    return this.getBytes(1);
  }

  setSignature(value: Uint8Array | string): void {
    jspb.Message.setField(this, 1, value);
  }

  getPublicKey_asU8(): Uint8Array {
    return this.getBytes(2);
  }

  setPublicKey(value: Uint8Array | string): void {
    jspb.Message.setField(this, 2, value);
  }

  serializeBinary(): Uint8Array {
    const writer = new jspb.BinaryWriter();
    const signature = this.getSignature_asU8();
    const publicKey = this.getPublicKey_asU8();
    if (signature.length > 0) writer.writeBytes(1, signature);
    if (publicKey.length > 0) writer.writeBytes(2, publicKey);
    return writer.getResultBuffer();
  }

  toObject(): object {
    return { signature: this.getSignature_asU8(), publicKey: this.getPublicKey_asU8() };
  }

  static deserializeBinary(bytes: Uint8Array): ClearsignAttestorSignatureShim {
    return ClearsignAttestorSignatureShim.deserializeBinaryFromReader(
      new ClearsignAttestorSignatureShim(),
      new jspb.BinaryReader(bytes)
    );
  }

  static deserializeBinaryFromReader(
    message: ClearsignAttestorSignatureShim,
    reader: jspb.BinaryReader
  ): ClearsignAttestorSignatureShim {
    while (reader.nextField()) {
      if (reader.isEndGroup()) break;
      if (reader.getFieldNumber() === 1) message.setSignature(reader.readBytes());
      else if (reader.getFieldNumber() === 2) message.setPublicKey(reader.readBytes());
      else reader.skipField();
    }
    return message;
  }
}

// Prefer the canonical generated classes when the pinned protocol supplies
// them. The shims keep older hdwallet installs wire-compatible while they are
// being advanced to the RC21 protocol pin.
const runtimeMessages = Messages as any;
const ClearsignAttestorGetPublicKey =
  runtimeMessages.ClearsignAttestorGetPublicKey || ClearsignAttestorGetPublicKeyShim;
const ClearsignAttestorPublicKey = runtimeMessages.ClearsignAttestorPublicKey || ClearsignAttestorPublicKeyShim;
const ClearsignAttestorSign = runtimeMessages.ClearsignAttestorSign || ClearsignAttestorSignShim;
const ClearsignAttestorSignature = runtimeMessages.ClearsignAttestorSignature || ClearsignAttestorSignatureShim;

const attestorMessages: Array<[string, string, number, any]> = [
  [
    "MESSAGETYPE_CLEARSIGNATTESTORGETPUBLICKEY",
    "ClearsignAttestorGetPublicKey",
    MESSAGETYPE_CLEARSIGN_ATTESTOR_GET_PUBLIC_KEY,
    ClearsignAttestorGetPublicKey,
  ],
  [
    "MESSAGETYPE_CLEARSIGNATTESTORPUBLICKEY",
    "ClearsignAttestorPublicKey",
    MESSAGETYPE_CLEARSIGN_ATTESTOR_PUBLIC_KEY,
    ClearsignAttestorPublicKey,
  ],
  [
    "MESSAGETYPE_CLEARSIGNATTESTORSIGN",
    "ClearsignAttestorSign",
    MESSAGETYPE_CLEARSIGN_ATTESTOR_SIGN,
    ClearsignAttestorSign,
  ],
  [
    "MESSAGETYPE_CLEARSIGNATTESTORSIGNATURE",
    "ClearsignAttestorSignature",
    MESSAGETYPE_CLEARSIGN_ATTESTOR_SIGNATURE,
    ClearsignAttestorSignature,
  ],
];

const messageTypes = Messages.MessageType as unknown as Record<string, number>;
for (const [enumName, name, id, message] of attestorMessages) {
  messageTypes[enumName] = id;
  messageNameRegistry[id] = name;
  messageTypeRegistry[id] = message;
}

export async function getAttestorPublicKey(transport: Transport): Promise<Uint8Array> {
  return transport.lockDuring(async () => {
    const response = await transport.call(
      MESSAGETYPE_CLEARSIGN_ATTESTOR_GET_PUBLIC_KEY,
      new ClearsignAttestorGetPublicKey(),
      { msgTimeout: core.LONG_TIMEOUT, omitLock: true }
    );
    const publicKey = (response.proto as ClearsignAttestorPublicKeyShim).getPublicKey_asU8();
    if (publicKey.length !== 33) throw new Error("Device returned an invalid ClearSign attestor public key");
    return publicKey;
  });
}

export async function attestPayload(
  transport: Transport,
  payload: Uint8Array
): Promise<{ signature: Uint8Array; publicKey: Uint8Array }> {
  return transport.lockDuring(async () => {
    const request = new ClearsignAttestorSign();
    request.setPayload(payload);
    const response = await transport.call(MESSAGETYPE_CLEARSIGN_ATTESTOR_SIGN, request, {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });
    const result = response.proto as ClearsignAttestorSignatureShim;
    const signature = result.getSignature_asU8();
    const publicKey = result.getPublicKey_asU8();
    if (signature.length !== 64 || publicKey.length !== 33) {
      throw new Error("Device returned an invalid ClearSign attestation");
    }
    return { signature, publicKey };
  });
}

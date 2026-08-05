/**
 * Regression coverage for ClearSign attestor message decoding.
 *
 * Transport.fromMessageBuffer always calls deserializeBinaryFromReader on the
 * constructor stored in messageTypeRegistry. Keep the attestor entries on the
 * canonical generated classes so public-key and signature responses cannot be
 * replaced by incomplete hand-written shims.
 */
import "./clearsign";

import * as jspb from "google-protobuf";

import { messageTypeRegistry } from "./typeRegistry";

const ATTESTOR_TYPES = [
  [1700, "ClearsignAttestorGetPublicKey"],
  [1701, "ClearsignAttestorPublicKey"],
  [1702, "ClearsignAttestorSign"],
  [1703, "ClearsignAttestorSignature"],
] as const;

describe("ClearSign attestor protobuf transport", () => {
  it.each(ATTESTOR_TYPES)("registers message type %i (%s) with reader decoding", (typeId) => {
    const registeredType = messageTypeRegistry[typeId] as any;
    expect(registeredType).toBeDefined();
    expect(typeof registeredType.deserializeBinaryFromReader).toBe("function");
  });

  it("decodes the public-key response through the transport registry path", () => {
    const publicKey = new Uint8Array(33).fill(0x02);
    const writer = new jspb.BinaryWriter();
    writer.writeBytes(1, publicKey);
    const MType = messageTypeRegistry[1701] as any;
    const decoded = MType.deserializeBinaryFromReader(new MType(), new jspb.BinaryReader(writer.getResultBuffer()));

    expect(Array.from(decoded.getPublicKey_asU8())).toEqual(Array.from(publicKey));
  });

  it("decodes the signature response through the transport registry path", () => {
    const signature = new Uint8Array(64).fill(0x5a);
    const publicKey = new Uint8Array(33).fill(0x03);
    const writer = new jspb.BinaryWriter();
    writer.writeBytes(1, signature);
    writer.writeBytes(2, publicKey);
    const MType = messageTypeRegistry[1703] as any;
    const decoded = MType.deserializeBinaryFromReader(new MType(), new jspb.BinaryReader(writer.getResultBuffer()));

    expect(Array.from(decoded.getSignature_asU8())).toEqual(Array.from(signature));
    expect(Array.from(decoded.getPublicKey_asU8())).toEqual(Array.from(publicKey));
  });
});

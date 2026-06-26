/**
 * Unit tests for EVM clear-signing protobuf shims.
 *
 * Validates that EthereumTxMetadata and EthereumMetadataAck
 * serialize/deserialize correctly through the same codepath
 * the transport uses (deserializeBinaryFromReader).
 */
// Force registration by importing the module
import "./ethereum";

import * as jspb from "google-protobuf";

// We can't import the classes directly (not exported), so we test
// via the type registry which is the same path the transport uses.
import { messageNameRegistry, messageTypeRegistry } from "./typeRegistry";

const MESSAGETYPE_ETHEREUMTXMETADATA = 115;
const MESSAGETYPE_ETHEREUMMETADATAACK = 116;

describe("EVM clear-signing protobuf shims", () => {
  describe("message registration", () => {
    it("registers EthereumTxMetadata (115) in type registry", () => {
      expect(messageTypeRegistry[MESSAGETYPE_ETHEREUMTXMETADATA]).toBeDefined();
      expect(messageNameRegistry[MESSAGETYPE_ETHEREUMTXMETADATA]).toBe("EthereumTxMetadata");
    });

    it("registers EthereumMetadataAck (116) in type registry", () => {
      expect(messageTypeRegistry[MESSAGETYPE_ETHEREUMMETADATAACK]).toBeDefined();
      expect(messageNameRegistry[MESSAGETYPE_ETHEREUMMETADATAACK]).toBe("EthereumMetadataAck");
    });
  });

  describe("EthereumTxMetadata round-trip", () => {
    it("serializes and deserializes signed_payload + key_id + metadata_version", () => {
      const MType = messageTypeRegistry[MESSAGETYPE_ETHEREUMTXMETADATA] as any;
      const msg = new MType();

      // Set fields
      const testPayload = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x01, 0x02, 0x03]);
      msg.setSignedPayload(testPayload);
      msg.setKeyId(42);
      msg.setMetadataVersion(1);

      // Serialize
      const bytes = msg.serializeBinary();
      expect(bytes.length).toBeGreaterThan(0);

      // Deserialize via deserializeBinaryFromReader (transport codepath)
      const reader = new jspb.BinaryReader(bytes);
      const decoded = new MType();
      MType.deserializeBinaryFromReader(decoded, reader);

      expect(decoded.getKeyId()).toBe(42);
      expect(decoded.getMetadataVersion()).toBe(1);
      // Payload comes back as Uint8Array
      const decodedPayload = decoded.getSignedPayload();
      expect(decodedPayload).toBeInstanceOf(Uint8Array);
      expect(Array.from(decodedPayload as Uint8Array)).toEqual(Array.from(testPayload));
    });

    it("handles empty payload gracefully", () => {
      const MType = messageTypeRegistry[MESSAGETYPE_ETHEREUMTXMETADATA] as any;
      const msg = new MType();
      msg.setKeyId(0);
      msg.setMetadataVersion(1);
      // No payload set

      const bytes = msg.serializeBinary();
      const reader = new jspb.BinaryReader(bytes);
      const decoded = new MType();
      MType.deserializeBinaryFromReader(decoded, reader);

      expect(decoded.getMetadataVersion()).toBe(1);
      expect(decoded.getKeyId()).toBe(0);
    });
  });

  describe("EthereumMetadataAck round-trip", () => {
    it("deserializes classification=VERIFIED and display_summary", () => {
      const MType = messageTypeRegistry[MESSAGETYPE_ETHEREUMMETADATAACK] as any;

      // Manually build a binary response as firmware would send it
      const writer = new jspb.BinaryWriter();
      writer.writeUint32(1, 1); // classification = VERIFIED
      writer.writeString(2, "Uniswap V2: swapExactETHForTokens");
      const bytes = writer.getResultBuffer();

      // Deserialize via deserializeBinaryFromReader (transport codepath)
      const reader = new jspb.BinaryReader(bytes);
      const msg = new MType();
      MType.deserializeBinaryFromReader(msg, reader);

      expect(msg.getClassification()).toBe(1);
      expect(msg.getDisplaySummary()).toBe("Uniswap V2: swapExactETHForTokens");
    });

    it("deserializes classification=MALFORMED with no summary", () => {
      const MType = messageTypeRegistry[MESSAGETYPE_ETHEREUMMETADATAACK] as any;

      const writer = new jspb.BinaryWriter();
      writer.writeUint32(1, 2); // classification = MALFORMED
      const bytes = writer.getResultBuffer();

      const reader = new jspb.BinaryReader(bytes);
      const msg = new MType();
      MType.deserializeBinaryFromReader(msg, reader);

      expect(msg.getClassification()).toBe(2);
      expect(msg.getDisplaySummary()).toBe("");
    });

    it("deserializes classification=OPAQUE (default)", () => {
      const MType = messageTypeRegistry[MESSAGETYPE_ETHEREUMMETADATAACK] as any;

      // Empty message — all defaults
      const bytes = new Uint8Array(0);
      const reader = new jspb.BinaryReader(bytes);
      const msg = new MType();
      MType.deserializeBinaryFromReader(msg, reader);

      expect(msg.getClassification()).toBe(0); // OPAQUE
      expect(msg.getDisplaySummary()).toBe("");
    });
  });

  describe("toObject", () => {
    it("EthereumTxMetadata.toObject returns expected shape", () => {
      const MType = messageTypeRegistry[MESSAGETYPE_ETHEREUMTXMETADATA] as any;
      const msg = new MType();
      msg.setSignedPayload(new Uint8Array([1, 2, 3]));
      msg.setKeyId(7);
      msg.setMetadataVersion(1);

      const obj = msg.toObject();
      expect(obj).toHaveProperty("signedPayload");
      expect(obj).toHaveProperty("keyId", 7);
      expect(obj).toHaveProperty("metadataVersion", 1);
    });

    it("EthereumMetadataAck.toObject returns expected shape", () => {
      const MType = messageTypeRegistry[MESSAGETYPE_ETHEREUMMETADATAACK] as any;
      const msg = new MType();
      // Simulate setting fields as firmware would
      jspb.Message.setField(msg, 1, 1);
      jspb.Message.setField(msg, 2, "test summary");

      const obj = msg.toObject();
      expect(obj).toEqual({ classification: 1, displaySummary: "test summary" });
    });
  });
});

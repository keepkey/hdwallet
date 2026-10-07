import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as Ethereum from "@keepkey/device-protocol/lib/messages-ethereum_pb";
import * as jspb from "google-protobuf";

import { EthereumTypedDataValueAck } from "./eip712Wire";
import { messageTypeRegistry } from "./typeRegistry";

describe("protobuf type registry", () => {
  it("contains only message constructors, never generated enum maps", () => {
    // Retired protocol MessageType values intentionally have no constructor;
    // every populated entry must still be a real protobuf message class.
    const constructors = Object.values(messageTypeRegistry).filter(Boolean);
    expect(constructors.length).toBeGreaterThan(0);
    for (const constructor of constructors) {
      expect(typeof constructor).toBe("function");
      expect(constructor.prototype).toBeInstanceOf(jspb.Message);
    }
  });
});

describe("structured EIP-712 replies decode the way the transport reads them", () => {
  // transport.ts fromMessageBuffer: MType.deserializeBinaryFromReader(new MType(), reader).
  // The hand-written classes once had only deserializeBinary, so the device's
  // first struct request failed with "deserializeBinaryFromReader is not a function".
  const decode = (typeId: number, body: Uint8Array) => {
    const MType = messageTypeRegistry[typeId] as any;
    return MType.deserializeBinaryFromReader(new MType(), new jspb.BinaryReader(body));
  };

  it("EthereumTypedDataStructRequest (1705)", () => {
    const w = new jspb.BinaryWriter();
    w.writeString(1, "PermitSingle");
    expect(decode(1705, w.getResultBuffer()).getName()).toBe("PermitSingle");
  });

  it("EthereumTypedDataValueRequest (1707)", () => {
    const w = new jspb.BinaryWriter();
    w.writePackedUint32(1, [1, 0, 2]);
    const plain = decode(1707, w.getResultBuffer());
    expect(plain.getMemberPathList()).toEqual([1, 0, 2]);
    expect(plain.getValueOffset()).toBeUndefined();
    // A chunked value's later request names an offset, 0 included.
    for (const offset of [0, 2048]) {
      const c = new jspb.BinaryWriter();
      c.writePackedUint32(1, [1, 0]);
      c.writeUint32(2, offset);
      const request = decode(1707, c.getResultBuffer());
      expect(request.getValueOffset()).toBe(offset);
      // The walk reads the request back from serializeBinary(); the offset,
      // 0 included, must survive the round trip.
      expect(decode(1707, request.serializeBinary()).getValueOffset()).toBe(offset);
    }
  });

  it("Features (17) carries capabilities", () => {
    const f = new Messages.Features();
    f.setMajorVersion(7);
    f.setMinorVersion(16);
    f.setCapabilitiesList([Messages.Features.Capability.CAPABILITY_EIP712_CHUNKED_VALUES]);
    const msg = decode(Messages.MessageType.MESSAGETYPE_FEATURES, f.serializeBinary());
    expect(msg.toObject().capabilitiesList).toEqual([26]);
  });
});

describe("EthereumTypedDataValueAck encodes the chunk fields only when set", () => {
  const fields = (bytes: Uint8Array) => {
    const out: Record<number, unknown> = {};
    const r = new jspb.BinaryReader(bytes);
    while (r.nextField()) {
      const n = r.getFieldNumber();
      out[n] = n === 1 ? Buffer.from(r.readBytes()).toString("hex") : r.readUint32();
    }
    return out;
  };

  it("whole, first chunk, later chunk", () => {
    const whole = new EthereumTypedDataValueAck();
    whole.setValue(new Uint8Array([0xab]));
    expect(fields(whole.serializeBinary())).toEqual({ 1: "ab" });
    const first = new EthereumTypedDataValueAck();
    first.setValue(new Uint8Array([0xab]));
    first.setValueTotalLength(1500);
    expect(fields(first.serializeBinary())).toEqual({ 1: "ab", 2: 1500 });
    const again = new EthereumTypedDataValueAck();
    again.setValue(new Uint8Array([0xab]));
    again.setValueOffset(0);
    expect(fields(again.serializeBinary())).toEqual({ 1: "ab", 3: 0 });
  });

  it("matches the generated device-protocol encoder byte for byte", () => {
    const chunk = new Uint8Array(1024).map((_, i) => i & 0xff);
    const cases: Array<{ value: Uint8Array; total?: number; offset?: number }> = [
      { value: new Uint8Array([0xab]) },
      { value: new Uint8Array(0) },
      { value: chunk },
      { value: chunk, total: 4900 },
      { value: chunk, offset: 0 },
      { value: chunk.subarray(0, 804), offset: 4096 },
    ];
    for (const c of cases) {
      const ours = new EthereumTypedDataValueAck();
      ours.setValue(c.value);
      const theirs = new Ethereum.EthereumTypedDataValueAck();
      theirs.setValue(c.value);
      if (c.total !== undefined) {
        ours.setValueTotalLength(c.total);
        theirs.setValueTotalLength(c.total);
      }
      if (c.offset !== undefined) {
        ours.setValueOffset(c.offset);
        theirs.setValueOffset(c.offset);
      }
      expect(Buffer.from(ours.serializeBinary()).toString("hex")).toEqual(
        Buffer.from(theirs.serializeBinary()).toString("hex")
      );
    }
  });
});

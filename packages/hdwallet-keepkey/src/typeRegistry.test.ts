import * as jspb from "google-protobuf";

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
    expect(decode(1707, w.getResultBuffer()).getMemberPathList()).toEqual([1, 0, 2]);
  });
});

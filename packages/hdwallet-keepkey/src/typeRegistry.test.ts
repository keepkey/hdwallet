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
      // Transport.fromMessageBuffer uses the generated reader entry point,
      // not deserializeBinary(). A hand-written response class that omits it
      // compiles but fails the first time a device replies.
      expect(typeof (constructor as any).deserializeBinaryFromReader).toBe("function");
    }
  });
});

import * as jspb from "google-protobuf";

import {
  EthereumTypedDataStructRequest,
  EthereumTypedDataValueRequest,
  MESSAGETYPE_ETHEREUMTYPEDDATASTRUCTREQUEST,
  MESSAGETYPE_ETHEREUMTYPEDDATAVALUEREQUEST,
} from "./eip712Wire";
import { messageTypeRegistry } from "./typeRegistry";

describe("structured EIP-712 response wire classes", () => {
  it("decodes a struct request through the exact transport registry entry point", () => {
    const writer = new jspb.BinaryWriter();
    writer.writeString(1, "PermitSingle");
    const Constructor = messageTypeRegistry[MESSAGETYPE_ETHEREUMTYPEDDATASTRUCTREQUEST] as any;
    const decoded = Constructor.deserializeBinaryFromReader(
      new Constructor(),
      new jspb.BinaryReader(writer.getResultBuffer())
    );
    expect(decoded).toBeInstanceOf(EthereumTypedDataStructRequest);
    expect(decoded.getName()).toBe("PermitSingle");
  });

  it("decodes a packed member path through the exact transport registry entry point", () => {
    const writer = new jspb.BinaryWriter();
    writer.writePackedUint32(1, [1, 0, 3]);
    const Constructor = messageTypeRegistry[MESSAGETYPE_ETHEREUMTYPEDDATAVALUEREQUEST] as any;
    const decoded = Constructor.deserializeBinaryFromReader(
      new Constructor(),
      new jspb.BinaryReader(writer.getResultBuffer())
    );
    expect(decoded).toBeInstanceOf(EthereumTypedDataValueRequest);
    expect(decoded.getMemberPathList()).toEqual([1, 0, 3]);
  });
});

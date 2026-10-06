import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as core from "@keepkey/hdwallet-core";

import { KeepKeyHDWallet } from "./keepkey";

describe("KeepKeyHDWallet firmware upload timeout", () => {
  it("uses the long-operation deadline for the complete firmware payload", async () => {
    const transport = {
      debugLink: false,
      call: jest.fn().mockResolvedValue({ message: {} }),
      getFirmwareHash: jest.fn().mockResolvedValue(new Uint8Array(32)),
    } as any;
    const wallet = new KeepKeyHDWallet(transport);

    await wallet.firmwareUpload(Buffer.alloc(1024 * 1024));

    expect(transport.call).toHaveBeenCalledTimes(1);
    expect(transport.call).toHaveBeenCalledWith(
      Messages.MessageType.MESSAGETYPE_FIRMWAREUPLOAD,
      expect.any(Messages.FirmwareUpload),
      { msgTimeout: core.LONG_TIMEOUT }
    );
  });
});

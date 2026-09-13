import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as Ethereum from "@keepkey/device-protocol/lib/messages-ethereum_pb";

import { ethSignTypedHash } from "./ethereum";

const PATH = [0x8000002c, 0x8000003c, 0x80000000, 0, 0];

function makeMockTransport(call: jest.Mock) {
  return {
    call,
    lockDuring: jest.fn(<T>(fn: () => Promise<T>) => fn()),
  } as any;
}

describe("EVM typed-hash signing", () => {
  it("sends exactly the reviewed domain and message hashes", async () => {
    const domain = new Uint8Array(32).fill(0x11);
    const message = new Uint8Array(32).fill(0x22);
    const call = jest.fn().mockImplementation((messageType, request: Ethereum.EthereumSignTypedHash) => {
      expect(messageType).toBe(Messages.MessageType.MESSAGETYPE_ETHEREUMSIGNTYPEDHASH);
      expect(request.getAddressNList()).toEqual(PATH);
      expect(request.getDomainSeparatorHash_asU8()).toEqual(domain);
      expect(request.getMessageHash_asU8()).toEqual(message);

      const response = new Ethereum.EthereumTypedDataSignature();
      response.setAddress("0x1234567890123456789012345678901234567890");
      response.setSignature(new Uint8Array(65).fill(0x42));
      return Promise.resolve({ proto: response });
    });
    const transport = makeMockTransport(call);

    const result = await ethSignTypedHash(transport, {
      addressNList: PATH,
      domainSeparatorHash: domain,
      messageHash: "0x" + "22".repeat(32),
    });

    expect(transport.lockDuring).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledTimes(1);
    expect(result.signature).toBe("0x" + "42".repeat(65));
  });

  it.each([
    ["domain", new Uint8Array(31), new Uint8Array(32)],
    ["message", new Uint8Array(32), "0x1234"],
  ])("rejects a malformed %s hash before transport", async (_label, domain, message) => {
    const call = jest.fn();
    await expect(ethSignTypedHash(makeMockTransport(call), {
      addressNList: PATH,
      domainSeparatorHash: domain,
      messageHash: message,
    })).rejects.toThrow("must be exactly 32 bytes");
    expect(call).not.toHaveBeenCalled();
  });
});

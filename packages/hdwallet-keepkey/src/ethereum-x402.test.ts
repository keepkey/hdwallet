import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as Ethereum from "@keepkey/device-protocol/lib/messages-ethereum_pb";
import * as core from "@keepkey/hdwallet-core";

import { ethSignTypedData } from "./ethereum";

const ETHEREUM_712_TYPES_VALUES = 114;
const MESSAGETYPE_FAILURE = 3;
const FAILURE_UNEXPECTEDMESSAGE = 1;

/** Streaming EIP-712 message types, 1704-1708. */
const STREAMING = new Set([1704, 1705, 1706, 1707, 1708]);

/**
 * What a device WITHOUT the streaming endpoint does: reject the unknown
 * message type. ethSignTypedData now tries streaming first for every document,
 * so a mock that answers every call as Ethereum712TypesValues is modelling a
 * device that cannot exist. Rejecting 1704 the way 7.14.x firmware does makes
 * this test cover the fallback as well as the old path.
 */
function rejectUnknownMessage() {
  // eslint-disable-next-line no-throw-literal
  throw {
    message_enum: MESSAGETYPE_FAILURE,
    message: { code: FAILURE_UNEXPECTEDMESSAGE, message: "Unexpected message" },
  };
}
const PATH = [0x8000002c, 0x8000003c, 0x80000000, 0, 0];

function makeMockTransport(call: jest.Mock) {
  return {
    debugLink: false,
    call,
    lockDuring: jest.fn(<T>(fn: () => Promise<T>) => fn()),
  } as any;
}

describe("x402 EVM structured signing", () => {
  it("sends the official EIP-3009 authorization as reviewed domain + message", async () => {
    const streamed: Array<{ phase: number; data: any }> = [];
    const call = jest.fn().mockImplementation((_messageType: number, request: Ethereum.Ethereum712TypesValues) => {
      if (STREAMING.has(_messageType)) rejectUnknownMessage();
      const phase = request.getEip712typevals() ?? 0;
      expect(_messageType).toBe(ETHEREUM_712_TYPES_VALUES);
      expect(JSON.parse(request.getEip712primetype() || "{}")).toEqual({
        primaryType: "TransferWithAuthorization",
      });

      const types = JSON.parse(request.getEip712types() || "{}").types;
      expect(types.EIP712Domain).toEqual([
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ]);
      streamed.push({ phase, data: JSON.parse(request.getEip712data() || "{}") });

      const response = new Ethereum.EthereumTypedDataSignature();
      response.setAddress("0x73d0385F4d8E00C5e6504C6030F47BF6212736A8");
      response.setSignature(new Uint8Array(65).fill(0x42));
      return Promise.resolve({ proto: response });
    });

    const transport = makeMockTransport(call);
    const result = await ethSignTypedData(transport, {
      addressNList: PATH,
      typedData: {
        // The official x402 client supplies only the authorization type; the
        // EIP712Domain type is inferred from the domain object.
        types: {
          TransferWithAuthorization: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
          ],
        },
        primaryType: "TransferWithAuthorization",
        domain: {
          name: "USDC",
          version: "2",
          chainId: 84532,
          verifyingContract: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        },
        message: {
          from: "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8",
          to: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
          value: BigInt("2000"),
          validAfter: BigInt("0"),
          validBefore: BigInt("2000000000"),
          nonce: "0xf3746613c2d920b5fdabc0856f2aeb2d4f88ee6037b8cc5d04a71a4462f13480",
        },
      },
    });

    // THREE calls now, not two: the streaming probe that this device rejects,
    // then the two old-path calls. The probe is the fallback working -- every
    // device in the field today answers 1704 with Failure_UnexpectedMessage,
    // and asserting two calls would be asserting that we never tried.
    expect(call).toHaveBeenCalledTimes(3);
    expect(transport.lockDuring).toHaveBeenCalledTimes(1);
    expect(call.mock.calls.map(([type]) => type)).toEqual([
      1704, // EthereumSignTypedData -- rejected as unknown
      ETHEREUM_712_TYPES_VALUES,
      ETHEREUM_712_TYPES_VALUES,
    ]);
    expect(call.mock.calls.slice(1).map(([, , options]) => options)).toEqual([
      { msgTimeout: expect.any(Number), omitLock: true },
      { msgTimeout: expect.any(Number), omitLock: true },
    ]);
    expect(streamed).toEqual([
      {
        phase: 1,
        data: {
          domain: {
            name: "USDC",
            version: "2",
            chainId: 84532,
            verifyingContract: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          },
        },
      },
      {
        phase: 2,
        data: {
          message: {
            from: "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8",
            to: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
            value: "2000",
            validAfter: "0",
            validBefore: "2000000000",
            nonce: "0xf3746613c2d920b5fdabc0856f2aeb2d4f88ee6037b8cc5d04a71a4462f13480",
          },
        },
      },
    ]);
    expect(result.address).toBe("0x73d0385F4d8E00C5e6504C6030F47BF6212736A8");
    expect(result.signature).toBe("0x" + "42".repeat(65));
  });
});

describe("Hyperliquid ApproveAgent on legacy firmware (#507)", () => {
  // Shape from hyperliquid-dex/hyperliquid-python-sdk utils/signing.py.
  // Hash fixtures independently computed with ethers TypedDataEncoder.
  const typedData = {
    domain: {
      name: "HyperliquidSignTransaction",
      version: "1",
      chainId: 42161,
      verifyingContract: "0x0000000000000000000000000000000000000000",
    },
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      "HyperliquidTransaction:ApproveAgent": [
        { name: "hyperliquidChain", type: "string" },
        { name: "agentAddress", type: "address" },
        { name: "agentName", type: "string" },
        { name: "nonce", type: "uint64" },
      ],
    },
    primaryType: "HyperliquidTransaction:ApproveAgent",
    message: {
      hyperliquidChain: "Mainnet",
      agentAddress: "0x1111111111111111111111111111111111111111",
      agentName: "QA agent",
      nonce: 1700000000000,
    },
  };

  it("uses the legacy hash endpoint after a 7.14.1 unknown-message response", async () => {
    const call = jest.fn().mockImplementation((messageType: number, msg: Ethereum.EthereumSignTypedHash) => {
      if (STREAMING.has(messageType)) rejectUnknownMessage();
      expect(messageType).toBe(Messages.MessageType.MESSAGETYPE_ETHEREUMSIGNTYPEDHASH);
      expect(msg.getAddressNList()).toEqual(PATH);
      expect(Buffer.from(msg.getDomainSeparatorHash_asU8()).toString("hex")).toBe(
        "2f54e643b38c9c2b65cb731aaf11c54f01705ee0cdf45aea16e2ac0a5ce7531a"
      );
      expect(Buffer.from(msg.getMessageHash_asU8()).toString("hex")).toBe(
        "c5b56400c8cd0456343cf6b965eafd00b7cf3be1359e57586ba528da1c9a31de"
      );
      const result = new Ethereum.EthereumTypedDataSignature();
      result.setAddress("0x1111111111111111111111111111111111111111");
      result.setSignature(new Uint8Array(65).fill(0x42));
      return Promise.resolve({ proto: result });
    });
    const result = await ethSignTypedData(makeMockTransport(call), { addressNList: PATH, typedData });
    expect(call.mock.calls.map(([kind]) => kind)).toEqual([
      1704,
      Messages.MessageType.MESSAGETYPE_ETHEREUMSIGNTYPEDHASH,
    ]);
    expect(result.signature).toBe("0x" + "42".repeat(65));
  });

  it("never downgrades a cancelled structured signing request", async () => {
    const error = new core.ActionCancelled();
    const call = jest.fn().mockRejectedValue(error);
    await expect(ethSignTypedData(makeMockTransport(call), { addressNList: PATH, typedData })).rejects.toBe(error);
    expect(call).toHaveBeenCalledTimes(1);
  });
});

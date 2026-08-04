import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as Types from "@keepkey/device-protocol/lib/types_pb";
import * as core from "@keepkey/hdwallet-core";

import { btcGetAccountPaths, btcGetAddress, btcIsSameAccount, btcSignTx, btcSupportsScriptType } from "./bitcoin";
import { KeepKeyHDWallet } from "./keepkey";
import { translateInputScriptType, translateOutputScriptType } from "./utils";

const BIP86_ACCOUNT = [0x80000000 + 86, 0x80000000, 0x80000000];
const BIP86_ADDRESS = [0x80000000 + 86, 0x80000000, 0x80000000, 0, 0];

function makeMockTransport(callImpl: jest.Mock) {
  return {
    debugLink: false,
    call: callImpl,
    lockDuring: <T>(fn: () => Promise<T>) => fn(),
  } as any;
}

describe("KeepKey Taproot host support", () => {
  it("maps the core P2TR types to the canonical device protocol enums", () => {
    expect(translateInputScriptType(core.BTCInputScriptType.SpendTaproot)).toBe(Types.InputScriptType.SPENDTAPROOT);
    expect(translateOutputScriptType(core.BTCOutputScriptType.PayToTaproot)).toBe(Types.OutputScriptType.PAYTOTAPROOT);
  });

  it("offers BIP-86 only for Bitcoin networks and recognizes all four Bitcoin account paths", async () => {
    const paths = btcGetAccountPaths({ coin: "Bitcoin", accountIdx: 0 });
    expect(paths).toContainEqual({
      coin: "Bitcoin",
      scriptType: core.BTCInputScriptType.SpendTaproot,
      addressNList: BIP86_ACCOUNT,
    });
    expect(btcIsSameAccount(paths)).toBe(true);

    expect(
      btcGetAccountPaths({ coin: "Litecoin", accountIdx: 0, scriptType: core.BTCInputScriptType.SpendTaproot })
    ).toEqual([]);
    await expect(btcSupportsScriptType("Litecoin", core.BTCInputScriptType.SpendTaproot)).resolves.toBe(false);
    await expect(btcSupportsScriptType("Bitcoin", core.BTCInputScriptType.SpendTaproot)).resolves.toBe(true);
  });

  it("serializes a displayed BIP-86 address request as SPENDTAPROOT", async () => {
    const call = jest.fn().mockImplementation((messageType: number, msg: Messages.GetAddress) => {
      expect(messageType).toBe(Messages.MessageType.MESSAGETYPE_GETADDRESS);
      expect(msg.getAddressNList()).toEqual(BIP86_ADDRESS);
      expect(msg.getCoinName()).toBe("Bitcoin");
      expect(msg.getShowDisplay()).toBe(true);
      expect(msg.getScriptType()).toBe(Types.InputScriptType.SPENDTAPROOT);

      const response = new Messages.Address();
      response.setAddress("bc1ptest");
      return Promise.resolve({ proto: response });
    });
    const wallet = { btcSupportsCoin: jest.fn().mockResolvedValue(true) } as any;

    await expect(
      btcGetAddress(wallet, makeMockTransport(call), {
        coin: "Bitcoin",
        addressNList: BIP86_ADDRESS,
        showDisplay: true,
        scriptType: core.BTCInputScriptType.SpendTaproot,
      })
    ).resolves.toBe("bc1ptest");
  });

  it("derives a BIP-86 account xpub with the firmware-compatible SPENDADDRESS wire type", async () => {
    const call = jest.fn().mockImplementation((messageType: number, msg: Messages.GetPublicKey) => {
      expect(messageType).toBe(Messages.MessageType.MESSAGETYPE_GETPUBLICKEY);
      expect(msg.getAddressNList()).toEqual(BIP86_ACCOUNT);
      expect(msg.getCoinName()).toBe("Bitcoin");
      expect(msg.getScriptType()).toBe(Types.InputScriptType.SPENDADDRESS);

      const response = new Messages.PublicKey();
      response.setXpub("xpub-bip86");
      return Promise.resolve({ proto: response });
    });
    const wallet = new KeepKeyHDWallet(makeMockTransport(call));

    await expect(
      wallet.getPublicKeys([
        {
          coin: "Bitcoin",
          addressNList: BIP86_ACCOUNT,
          curve: "secp256k1",
          scriptType: core.BTCInputScriptType.SpendTaproot,
        },
      ])
    ).resolves.toEqual([{ xpub: "xpub-bip86" }]);
  });

  it("requires the firmware-reported supports_taproot capability", async () => {
    const supported = new KeepKeyHDWallet(
      makeMockTransport(jest.fn().mockResolvedValue({ message: { supportsTaproot: true } }))
    );
    const unsupported = new KeepKeyHDWallet(
      makeMockTransport(jest.fn().mockResolvedValue({ message: { supportsTaproot: false } }))
    );

    await expect(supported.btcSupportsScriptType("Bitcoin", core.BTCInputScriptType.SpendTaproot)).resolves.toBe(true);
    await expect(unsupported.btcSupportsScriptType("Bitcoin", core.BTCInputScriptType.SpendTaproot)).resolves.toBe(
      false
    );
    await expect(supported.btcSupportsScriptType("Litecoin", core.BTCInputScriptType.SpendTaproot)).resolves.toBe(
      false
    );
  });

  it("sends a P2TR input amount without demanding a legacy previous transaction", async () => {
    let capturedInput: Types.TxInputType | undefined;
    const call = jest.fn().mockImplementation((messageType: number, msg: any) => {
      if (messageType === Messages.MessageType.MESSAGETYPE_SIGNTX) {
        const details = new Types.TxRequestDetailsType();
        details.setRequestIndex(0);
        const request = new Messages.TxRequest();
        request.setRequestType(Types.RequestType.TXINPUT);
        request.setDetails(details);
        return Promise.resolve({
          message_enum: Messages.MessageType.MESSAGETYPE_TXREQUEST,
          proto: request,
        });
      }

      expect(messageType).toBe(Messages.MessageType.MESSAGETYPE_TXACK);
      capturedInput = (msg as Messages.TxAck).getTx()?.getInputsList()[0];

      const serialized = new Types.TxRequestSerializedType();
      serialized.setSignatureIndex(0);
      serialized.setSignature(new Uint8Array(64).fill(0x42));
      const finished = new Messages.TxRequest();
      finished.setRequestType(Types.RequestType.TXFINISHED);
      finished.setSerialized(serialized);
      return Promise.resolve({
        message_enum: Messages.MessageType.MESSAGETYPE_TXREQUEST,
        proto: finished,
      });
    });
    const wallet = { btcSupportsCoin: jest.fn().mockResolvedValue(true) } as any;

    const result = await btcSignTx(wallet, makeMockTransport(call), {
      coin: "Bitcoin",
      inputs: [
        {
          txid: "11".repeat(32),
          vout: 0,
          addressNList: BIP86_ADDRESS,
          amount: "100000",
          scriptType: core.BTCInputScriptType.SpendTaproot,
        },
      ],
      outputs: [{ address: "1BitcoinEaterAddressDontSendf59kuE", amount: "90000" }],
    });

    expect(capturedInput?.getScriptType()).toBe(Types.InputScriptType.SPENDTAPROOT);
    expect(capturedInput?.getAmount()).toBe(100000);
    expect(result.signatures).toEqual(["42".repeat(64)]);
  });
});

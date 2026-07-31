import * as jspb from "google-protobuf";

import { SolanaSignedTx, solanaSignTx } from "./solana";

const SOLANA_SIGN_TX = 752;
const SOLANA_SIGNED_TX = 753;
const PATH = [0x8000002c, 0x800001f5, 0x80000000, 0x80000000];
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const PAY_TO = "GmaDrppBC7P5ARKV8g3djiwP89vz1jLK23V2GBjuAEGB";

function makeMockTransport(callImpl: jest.Mock) {
  return {
    debugLink: false,
    call: callImpl,
    lockDuring: <T>(fn: () => Promise<T>) => fn(),
  } as any;
}

describe("Solana x402 display metadata", () => {
  it("forwards token metadata in field 4 and payTo owner in field 12", async () => {
    const transport = makeMockTransport(
      jest.fn().mockImplementation((messageType: number, msg: jspb.Message) => {
        expect(messageType).toBe(SOLANA_SIGN_TX);
        const reader = new jspb.BinaryReader((msg as any).serializeBinary());
        let mint: Uint8Array | undefined;
        let symbol: string | undefined;
        let decimals: number | undefined;
        let owner: Uint8Array | undefined;

        while (reader.nextField()) {
          if (reader.isEndGroup()) break;
          if (reader.getFieldNumber() === 4) {
            const nested = new jspb.BinaryReader(reader.readBytes());
            while (nested.nextField()) {
              if (nested.isEndGroup()) break;
              switch (nested.getFieldNumber()) {
                case 1:
                  mint = nested.readBytes();
                  break;
                case 2:
                  symbol = nested.readString();
                  break;
                case 3:
                  decimals = nested.readUint32();
                  break;
                default:
                  nested.skipField();
              }
            }
          } else if (reader.getFieldNumber() === 12) {
            owner = reader.readBytes();
          } else {
            reader.skipField();
          }
        }

        expect(mint).toHaveLength(32);
        expect(symbol).toBe("USDC");
        expect(decimals).toBe(6);
        expect(owner).toHaveLength(32);

        const response = new SolanaSignedTx();
        response.setSignature(new Uint8Array(64).fill(0x42));
        return Promise.resolve({
          message_enum: SOLANA_SIGNED_TX,
          message_type: "SolanaSignedTx",
          proto: response,
        });
      })
    );

    const result = await solanaSignTx(transport, {
      addressNList: PATH,
      rawTx: new Uint8Array([0x80, 0x00]),
      tokenInfo: [{ mint: USDC_MINT, symbol: "USDC", decimals: 6 }],
      tokenRecipientOwners: [PAY_TO],
    });
    expect(result.signature).toHaveLength(64);
  });

  it("rejects a malformed recipient owner before device transport", async () => {
    const call = jest.fn();
    const transport = makeMockTransport(call);
    await expect(
      solanaSignTx(transport, {
        addressNList: PATH,
        rawTx: new Uint8Array([0x80, 0x00]),
        tokenRecipientOwners: [new Uint8Array(31)],
      })
    ).rejects.toThrow("exactly 32 bytes");
    expect(call).not.toHaveBeenCalled();
  });
});

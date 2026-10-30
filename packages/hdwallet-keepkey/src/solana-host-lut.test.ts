import * as bs58 from "bs58";
import * as jspb from "google-protobuf";

import { SolanaSignedTx, solanaSignTx } from "./solana";

const SOLANA_SIGN_TX = 752;
const SOLANA_SIGNED_TX = 753;
const PATH = [0x8000002c, 0x800001f5, 0x80000000, 0x80000000];
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WSOL_MINT = "So11111111111111111111111111111111111111112";

type Wire = { field5: Uint8Array[]; other: number[] };

function readWire(bytes: Uint8Array): Wire {
  const reader = new jspb.BinaryReader(bytes);
  const wire: Wire = { field5: [], other: [] };
  while (reader.nextField()) {
    if (reader.isEndGroup()) break;
    const n = reader.getFieldNumber();
    if (n === 5) {
      wire.field5.push(reader.readBytes());
    } else {
      wire.other.push(n);
      reader.skipField();
    }
  }
  return wire;
}

function captureTransport(seen: Wire[]) {
  return {
    debugLink: false,
    lockDuring: <T>(fn: () => Promise<T>) => fn(),
    call: jest.fn().mockImplementation((messageType: number, msg: jspb.Message) => {
      expect(messageType).toBe(SOLANA_SIGN_TX);
      seen.push(readWire((msg as any).serializeBinary()));
      const response = new SolanaSignedTx();
      response.setSignature(new Uint8Array(64).fill(0x42));
      return Promise.resolve({ message_enum: SOLANA_SIGNED_TX, message_type: "SolanaSignedTx", proto: response });
    }),
  } as any;
}

describe("Solana host-resolved lookup accounts (firmware 7.17+)", () => {
  it("sends each key in field 5, in order, with no LUT signature or signer", async () => {
    const seen: Wire[] = [];
    const wsol = Uint8Array.from(bs58.decode(WSOL_MINT));
    await solanaSignTx(captureTransport(seen), {
      addressNList: PATH,
      rawTx: new Uint8Array([0x80, 0x00]),
      lutAccounts: [USDC_MINT, wsol],
    });
    expect(seen).toHaveLength(1);
    expect(seen[0].field5.map((k) => bs58.encode(k))).toEqual([USDC_MINT, WSOL_MINT]);
    expect(seen[0].other).not.toContain(6);
    expect(seen[0].other).not.toContain(7);
  });

  it("refuses lutAccounts next to a LUT proof, a schema or a certificate", async () => {
    const seen: Wire[] = [];
    const base = { addressNList: PATH, rawTx: new Uint8Array([0x80, 0x00]), lutAccounts: [WSOL_MINT] };
    const sig = new Uint8Array(64).fill(1);
    await expect(
      solanaSignTx(captureTransport(seen), {
        ...base,
        lutProof: { accounts: [WSOL_MINT], signature: sig, signerKeyId: 0 },
      })
    ).rejects.toThrow(/cannot be combined/);
    await expect(
      solanaSignTx(captureTransport(seen), {
        ...base,
        schema: { payload: new Uint8Array([1]), signature: sig, signerKeyId: 0 },
      })
    ).rejects.toThrow(/cannot be combined/);
    expect(seen).toHaveLength(0);
  });

  it("refuses an empty list and more than 64 keys", async () => {
    const seen: Wire[] = [];
    await expect(
      solanaSignTx(captureTransport(seen), { addressNList: PATH, rawTx: new Uint8Array([0x80]), lutAccounts: [] })
    ).rejects.toThrow(/1-64/);
    await expect(
      solanaSignTx(captureTransport(seen), {
        addressNList: PATH,
        rawTx: new Uint8Array([0x80]),
        lutAccounts: Array.from({ length: 65 }, (_, i) => new Uint8Array(32).fill(i + 1)),
      })
    ).rejects.toThrow(/1-64/);
    expect(seen).toHaveLength(0);
  });
});

import * as jspb from "google-protobuf";

import { SolanaSignedTx, solanaSignTx } from "./solana";

const SOLANA_SIGN_TX = 752;
const SOLANA_SIGNED_TX = 753;
const PATH = [0x8000002c, 0x800001f5, 0x80000000, 0x80000000];

function makeTransport(inspect: (bytes: Uint8Array) => void) {
  return {
    debugLink: false,
    lockDuring: <T>(fn: () => Promise<T>) => fn(),
    call: jest.fn().mockImplementation((messageType: number, msg: jspb.Message) => {
      expect(messageType).toBe(SOLANA_SIGN_TX);
      inspect((msg as any).serializeBinary());
      const response = new SolanaSignedTx();
      response.setSignature(new Uint8Array(64).fill(0x42));
      return Promise.resolve({
        message_enum: SOLANA_SIGNED_TX,
        message_type: "SolanaSignedTx",
        proto: response,
      });
    }),
  } as any;
}

function decodeFieldNumbers(bytes: Uint8Array): number[] {
  const reader = new jspb.BinaryReader(bytes);
  const fields: number[] = [];
  while (reader.nextField()) {
    if (reader.isEndGroup()) break;
    fields.push(reader.getFieldNumber());
    reader.skipField();
  }
  return fields;
}

describe("certified Solana wire shapes", () => {
  it("encodes schema + certificate without manufacturing LUT fields", async () => {
    const transport = makeTransport((bytes) => {
      const fields = decodeFieldNumbers(bytes);
      expect(fields).toEqual(expect.arrayContaining([1, 3, 9, 10, 11, 13]));
      expect(fields).not.toContain(5);
      expect(fields).not.toContain(6);
      expect(fields).not.toContain(7);
    });

    await solanaSignTx(transport, {
      addressNList: PATH,
      rawTx: new Uint8Array([0x80, 0x00]),
      schema: {
        payload: new Uint8Array([0x4b, 0x4b, 0x53, 0x4f, 0x4c]),
        signature: new Uint8Array(64).fill(0x22),
        signerKeyId: 0x80,
      },
      certificate: new Uint8Array(139).fill(0x33),
    });
  });

  it("adds the LUT account/signature/id only for the ALT-backed shape", async () => {
    const transport = makeTransport((bytes) => {
      const fields = decodeFieldNumbers(bytes);
      expect(fields.filter((field) => field === 5)).toHaveLength(2);
      expect(fields).toEqual(expect.arrayContaining([6, 7, 9, 10, 11, 13]));
    });

    await solanaSignTx(transport, {
      addressNList: PATH,
      rawTx: new Uint8Array([0x80, 0x00]),
      lutProof: {
        accounts: [new Uint8Array(32).fill(0x11), new Uint8Array(32).fill(0x12)],
        signature: new Uint8Array(64).fill(0x21),
        signerKeyId: 0x80,
      },
      schema: {
        payload: new Uint8Array([0x4b, 0x4b, 0x53, 0x4f, 0x4c]),
        signature: new Uint8Array(64).fill(0x22),
        signerKeyId: 0x80,
      },
      certificate: new Uint8Array(139).fill(0x33),
    });
  });

  it("rejects partial or mixed certified material before transport", async () => {
    const call = jest.fn();
    const transport = {
      debugLink: false,
      lockDuring: <T>(fn: () => Promise<T>) => fn(),
      call,
    } as any;

    await expect(solanaSignTx(transport, {
      addressNList: PATH,
      rawTx: new Uint8Array([0x80, 0x00]),
      certificate: new Uint8Array(139),
    })).rejects.toThrow(/requires schema signerKeyId 0x80/);

    await expect(solanaSignTx(transport, {
      addressNList: PATH,
      rawTx: new Uint8Array([0x80, 0x00]),
      schema: {
        payload: new Uint8Array([1]),
        signature: new Uint8Array(64),
        signerKeyId: 0x80,
      },
    })).rejects.toThrow(/requires a certificate/);

    expect(call).not.toHaveBeenCalled();
  });
});

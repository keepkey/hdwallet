import { makeErc7730DefinitionChunk } from "./ethereum";
import * as Ethereum from "./ethereum-erc7730-proto";

const id = new Uint8Array(32).fill(0x11);
const envelope = new Uint8Array(1500).map((_, index) => index & 0xff);
const contract = new Uint8Array(20).fill(0x22);
const selector = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
const catalog = {
  primaryDefinitionId: id,
  definitions: [
    {
      definitionId: id,
      envelope,
      kind: 1 as const,
      chainId: 1,
      contractAddress: contract,
      selectorOrTypeHash: selector,
    },
  ],
};

function request(offset = 0, length = 1024): Ethereum.EthereumClearSignDefinitionRequest {
  const value = new Ethereum.EthereumClearSignDefinitionRequest();
  value.setKind(Ethereum.EthereumClearSignDefinitionKind.ERC7730_CALLDATA);
  value.setChainId(1);
  value.setContractAddress(contract);
  value.setSelectorOrTypeHash(selector);
  value.setOffset(offset);
  value.setLength(length);
  return value;
}

describe("ERC-7730 signed definition catalog", () => {
  it("serves an exact bounded tuple lookup", () => {
    const chunk = makeErc7730DefinitionChunk(catalog, request(1024, 1024));
    expect(chunk.getDefinitionId_asU8()).toEqual(id);
    expect(chunk.getOffset()).toBe(1024);
    expect(chunk.getTotalLength()).toBe(1500);
    expect(chunk.getData_asU8()).toEqual(envelope.slice(1024));
  });

  it("resolves recursive requests by authenticated definition id", () => {
    const value = request(32, 64);
    value.setDefinitionId(id);
    value.setRecursionDepth(4);
    expect(makeErc7730DefinitionChunk(catalog, value).getData_asU8()).toEqual(envelope.slice(32, 96));
  });

  it("refuses unknown, oversized, and over-depth requests", () => {
    const unknown = request();
    unknown.setSelectorOrTypeHash(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
    expect(() => makeErc7730DefinitionChunk(catalog, unknown)).toThrow("not in the signed catalog");
    expect(() => makeErc7730DefinitionChunk(catalog, request(0, 1025))).toThrow("Invalid ERC-7730 chunk range");
    const tooDeep = request();
    tooDeep.setRecursionDepth(5);
    expect(() => makeErc7730DefinitionChunk(catalog, tooDeep)).toThrow("recursion depth exceeds host limit");
  });

  it("refuses a definition-id match with a different request identity", () => {
    const mismatched = request();
    mismatched.setDefinitionId(id);
    mismatched.setChainId(10);
    expect(() => makeErc7730DefinitionChunk(catalog, mismatched)).toThrow("identity does not match");
  });
});

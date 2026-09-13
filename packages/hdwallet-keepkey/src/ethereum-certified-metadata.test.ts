import { requireVerifiedCertifiedMetadata } from "./ethereum";

describe("certified ClearSign metadata policy", () => {
  it("accepts a verified KeepKey-certified envelope", () => {
    expect(() => requireVerifiedCertifiedMetadata(0x80, 1)).not.toThrow();
  });

  it.each([0, 2])("fails closed for certified classification %i", (classification) => {
    expect(() => requireVerifiedCertifiedMetadata(0x80, classification)).toThrow(
      "The transaction was not sent for blind signing"
    );
  });

  it("preserves legacy fallback for runtime metadata", () => {
    expect(() => requireVerifiedCertifiedMetadata(3, 2)).not.toThrow();
  });
});

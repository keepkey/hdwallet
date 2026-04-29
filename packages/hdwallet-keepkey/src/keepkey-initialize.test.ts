/**
 * Unit tests for KeepKeyHDWallet.initialize() version-field validation.
 *
 * Regression: when transport.call() returns a Features payload missing
 * majorVersion / minorVersion / patchVersion (e.g. wrong message type
 * miscast, decode mismatch, or device in an unexpected state), the prior
 * code constructed `vundefined.undefined.undefined` and called
 * semver.gte() on it, which threw the opaque error
 *   "Invalid Version: vundefined.undefined.undefined"
 * leaking from the WebUSB pair path with no actionable diagnostic.
 *
 * The fix throws a clear error before reaching semver.
 */
import { KeepKeyHDWallet } from "./keepkey";

function makeMockTransport(callResponse: any) {
  return {
    debugLink: false,
    call: jest.fn().mockResolvedValue(callResponse),
    getDeviceID: jest.fn().mockResolvedValue("mock-device-id"),
    keyring: { addAlias: jest.fn() },
  } as any;
}

describe("KeepKeyHDWallet.initialize() version-field validation", () => {
  it("throws a clear error when Features has no version fields", async () => {
    const transport = makeMockTransport({
      message: {
        deviceId: "mock-device-id",
        // majorVersion / minorVersion / patchVersion intentionally absent
      },
    });
    const wallet = new KeepKeyHDWallet(transport);

    const err = await wallet.initialize().catch((e: any) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(/KeepKey Initialize returned Features without firmware version/);
    expect(err.message).toMatch(/major=undefined, minor=undefined, patch=undefined/);
  });

  it("throws when only majorVersion is missing", async () => {
    const transport = makeMockTransport({
      message: {
        deviceId: "mock-device-id",
        minorVersion: 14,
        patchVersion: 0,
      },
    });
    const wallet = new KeepKeyHDWallet(transport);
    await expect(wallet.initialize()).rejects.toThrow(/KeepKey Initialize returned Features without firmware version/);
  });

  it("resolves successfully when all version fields are present", async () => {
    const transport = makeMockTransport({
      message: {
        deviceId: "mock-device-id",
        majorVersion: 7,
        minorVersion: 14,
        patchVersion: 0,
      },
    });
    const wallet = new KeepKeyHDWallet(transport);

    const features = await wallet.initialize();
    expect(features).toBeDefined();
    expect(features.majorVersion).toBe(7);
    expect(features.minorVersion).toBe(14);
    expect(features.patchVersion).toBe(0);
  });

  it("regression: never produces 'Invalid Version: vundefined.undefined.undefined'", async () => {
    const transport = makeMockTransport({
      message: { deviceId: "mock-device-id" },
    });
    const wallet = new KeepKeyHDWallet(transport);
    let err: any;
    try {
      await wallet.initialize();
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    expect(String(err.message ?? err)).not.toMatch(/Invalid Version: vundefined\.undefined\.undefined/);
  });
});

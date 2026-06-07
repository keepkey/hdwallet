import * as core from "@keepkey/hdwallet-core";
import * as keepkey from "@keepkey/hdwallet-keepkey";
import type { WebUSBDevice } from "usb";

import { VENDOR_ID, WEBUSB_PRODUCT_ID } from "./utils";

export type Device = WebUSBDevice & { serialNumber: string };

// Bound a single USB transfer so a wedged/suspended/unplugged device cannot
// block the caller forever (libusb submits transfers with an infinite timeout).
// Writes complete in well under DEFAULT_TIMEOUT; a read may legitimately wait on
// a device button press, so it gets LONG_TIMEOUT. On timeout we throw -- the
// caller's disconnect path closes the device, which aborts the orphaned native
// transfer and releases the claimed interface (otherwise a later claimInterface
// hits LIBUSB code 19 / ConflictingApp against our own zombie transfer).
function withTransferTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  // Swallow a late rejection from the orphaned transfer after we've given up.
  promise.catch(() => {});
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer!));
}

export class TransportDelegate implements keepkey.TransportDelegate {
  usbDevice: Device;

  constructor(usbDevice: Device) {
    if (usbDevice.vendorId !== VENDOR_ID) throw new core.WebUSBCouldNotPair("KeepKey", "bad vendor id");
    if (usbDevice.productId !== WEBUSB_PRODUCT_ID) throw new core.FirmwareUpdateRequired("KeepKey", "6.1.0");
    this.usbDevice = usbDevice;
  }

  async create(usbDevice: Device): Promise<TransportDelegate | null> {
    if (usbDevice.vendorId !== VENDOR_ID) return null;
    return new TransportDelegate(usbDevice);
  }

  async isOpened(): Promise<boolean> {
    return this.usbDevice.opened;
  }

  async getDeviceID(): Promise<string> {
    return this.usbDevice.serialNumber;
  }

  async connect(): Promise<void> {
    if (await this.isOpened()) throw new Error("cannot connect an already-connected connection");

    await this.usbDevice.open();

    if (this.usbDevice.configuration === null) await this.usbDevice.selectConfiguration(1);

    try {
      await this.usbDevice.claimInterface(0);
    } catch (e) {
      if (core.isIndexable(e) && e.code === 18)
        // "The requested interface implements a protected class"
        throw new core.FirmwareUpdateRequired("KeepKey", "6.1.0");
      if (core.isIndexable(e) && e.code === 19)
        // "Unable to claim interface"
        throw new core.ConflictingApp("KeepKey");
      throw e;
    }
  }

  async tryConnectDebugLink(): Promise<boolean> {
    // We have to use "guess & check" here because the browser doesn't give us a
    // way to inspect the descriptors :(
    try {
      await this.usbDevice.claimInterface(1);
      return true;
    } catch (e) {
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // If the device is disconnected, this will fail and throw, which is fine.
      await this.usbDevice.close();
    } catch (e) {
      console.warn("Disconnect Error (Ignored):", e);
    }
  }

  async writeChunk(buf: Uint8Array, debugLink?: boolean): Promise<void> {
    const result = await withTransferTimeout(
      this.usbDevice.transferOut(
        debugLink ? 2 : 1,
        buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
      ),
      core.DEFAULT_TIMEOUT,
      "transferOut"
    );
    if (result.status !== "ok" || result.bytesWritten !== buf.length) throw new Error("bad write");
  }

  async readChunk(debugLink?: boolean): Promise<Uint8Array> {
    // LONG_TIMEOUT: a read may legitimately block on a device button press
    // (PIN, passphrase, tx/seed confirmation), so it must not be cut short.
    const result = await withTransferTimeout(
      this.usbDevice.transferIn(debugLink ? 2 : 1, keepkey.SEGMENT_SIZE + 1),
      core.LONG_TIMEOUT,
      "transferIn"
    );

    if (result.status === "stall") {
      // Reset the halt on the IN pipe we just read (not OUT), then surface a
      // retryable error -- a stalled transfer's buffer is not a valid packet.
      await this.usbDevice.clearHalt("in", debugLink ? 2 : 1);
      throw new Error("bad read");
    } else if (result.status !== "ok" || result.data === undefined) {
      throw new Error("bad read");
    }

    return new Uint8Array(
      result.data.buffer.slice(result.data.byteOffset, result.data.byteOffset + result.data.byteLength)
    );
  }
}

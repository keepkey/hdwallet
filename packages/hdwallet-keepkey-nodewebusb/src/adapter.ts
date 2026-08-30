import * as keepkey from "@keepkey/hdwallet-keepkey";
import { webusb } from "usb";

import { Device, TransportDelegate } from "./transport";
import { HID_PRODUCT_ID, VENDOR_ID, WEBUSB_PRODUCT_ID } from "./utils";

export const NodeWebUSBAdapterDelegate = {
  async getDevices(): Promise<Device[]> {
    const devices = (await webusb.getDevices()).filter((d) => d.serialNumber !== undefined) as Device[];
    return devices.filter((x) => x.vendorId === VENDOR_ID && [WEBUSB_PRODUCT_ID, HID_PRODUCT_ID].includes(x.productId));
  },
  async getDevice(serialNumber?: string): Promise<Device> {
    // Only match the WebUSB PID (0x0002). The TransportDelegate ctor rejects any
    // other PID with FirmwareUpdateRequired, so matching legacy 0x0001 here just
    // produced a doomed pair attempt + a misleading "Firmware 6.1.0 required"
    // before the caller's HID fallback. Old (PID 0x0001) devices now skip WebUSB
    // cleanly and pair over HID. (getDevices() still lists 0x0001 for detection.)
    const out = await webusb.requestDevice({
      filters: [
        { vendorId: VENDOR_ID, productId: WEBUSB_PRODUCT_ID, serialNumber },
      ],
    });
    if (out.serialNumber === undefined) throw new Error("expected serial number");
    return out as Device;
  },
  async getTransportDelegate(device: Device) {
    return new TransportDelegate(device);
  },
};

export const Adapter = keepkey.Adapter.fromDelegate(NodeWebUSBAdapterDelegate);
export const NodeWebUSBKeepKeyAdapter = Adapter;

"use client";

import React from "react";
import { useWallet } from "@/context/WalletContext";

export function SectionSelect() {
  const { devices, selectedDeviceId, selectDevice, pairKeepKey, pairKKBridge, pairEmulator, pairNative } = useWallet();

  return (
    <div className="container">
      <h4>Select</h4>
      <div style={{ marginBottom: "0.5rem" }}>
        <button type="button" onClick={pairKeepKey}>Pair KeepKey</button>
        <button type="button" onClick={pairKKBridge}>Pair KKBridge</button>
        <button type="button" onClick={pairEmulator}>Pair Emulator</button>
        <button type="button" onClick={pairNative}>Pair Native</button>
      </div>
      <select
        size={4}
        value={selectedDeviceId ?? ""}
        onChange={(e) => selectDevice(e.target.value || null)}
        style={{ height: 100, minWidth: 200 }}
      >
        {devices.length === 0 && (
          <option value="">(No devices)</option>
        )}
        {devices.map((d) => (
          <option key={d.id} value={d.id}>
            {d.label}
          </option>
        ))}
      </select>
    </div>
  );
}

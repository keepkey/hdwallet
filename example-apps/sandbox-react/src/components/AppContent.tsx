"use client";

import React, { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { PinModal, PassphraseModal, MnemonicModal } from "@/components/Modals";
import {
  getVendor,
  getModel,
  getDeviceID,
  getFirmware,
  getLabel,
  getXpubs,
  doPing,
  doWipe,
  doLoadDevice,
  doClearSession,
  doDisconnect,
} from "@/handlers/manage";
import { pressYes, pressNo, cancel } from "@/handlers/debugLink";
import { SectionSelect } from "@/components/SectionSelect";
import { SectionEventLog } from "@/components/SectionEventLog";
import { SectionDebugLink } from "@/components/SectionDebugLink";
import { SectionManage } from "@/components/SectionManage";
import { SectionXpubs } from "@/components/SectionXpubs";
import { SectionEthereum } from "@/components/SectionEthereum";
import { SectionErc20 } from "@/components/SectionErc20";
import { ChainSection } from "@/components/ChainSection";
import { chainSections } from "@/config/chainSections";

const allChainOptions = [
  ...chainSections.map((c) => c.title),
  "Ethereum",
  "ERC-20",
];

function App() {
  const { wallet, setResult, results } = useWallet();
  const [selectedChain, setSelectedChain] = useState(allChainOptions[0]);

  const activeCfg = chainSections.find((c) => c.title === selectedChain);

  return (
    <div style={{ padding: "1rem", maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ marginBottom: "0.5rem" }}>HDWallet Sandbox (React)</h1>

      <SectionSelect />

      <div className="container">
        <h4>Event Log</h4>
        <SectionEventLog />
      </div>

      <SectionDebugLink
        onYes={() => pressYes(wallet)}
        onNo={() => pressNo(wallet)}
        onCancel={() => cancel(wallet)}
      />

      <div className="container">
        <h4>Manage</h4>
        <div style={{ flexWrap: "wrap", display: "flex", gap: "0.25rem", marginBottom: "0.5rem" }}>
          <button type="button" onClick={() => getVendor(wallet, setResult, "manage")}>Vendor</button>
          <button type="button" onClick={() => getModel(wallet, setResult, "manage")}>Model</button>
          <button type="button" onClick={() => getDeviceID(wallet, setResult, "manage")}>DeviceID</button>
          <button type="button" onClick={() => getFirmware(wallet, setResult, "manage")}>Firmware</button>
          <button type="button" onClick={() => getLabel(wallet, setResult, "manage")}>Label</button>
          <button type="button" onClick={() => getXpubs(wallet, setResult, "manage", "all")}>All xpubs</button>
          <button type="button" onClick={() => doPing(wallet, setResult, "manage")}>Ping</button>
          <button type="button" onClick={() => doWipe(wallet, setResult, "manage")}>Wipe</button>
          <button type="button" onClick={() => doLoadDevice(wallet, setResult, "manage")}>Load</button>
          <button type="button" onClick={() => doClearSession(wallet, setResult, "manage")}>Clear Session</button>
          <button type="button" onClick={() => doDisconnect(wallet, setResult, "manage")}>Disconnect</button>
        </div>
        <input type="text" value={results.manage ?? ""} readOnly />
      </div>

      <SectionXpubs />

      <div className="container">
        <h4>Chain</h4>
        <select
          value={selectedChain}
          onChange={(e) => setSelectedChain(e.target.value)}
          style={{ width: "100%", marginBottom: "0.75rem" }}
        >
          {allChainOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {activeCfg && <ChainSection key={activeCfg.title} {...activeCfg} />}
      {selectedChain === "Ethereum" && <SectionEthereum />}
      {selectedChain === "ERC-20" && <SectionErc20 />}

      <PinModal />
      <PassphraseModal />
      <MnemonicModal />
    </div>
  );
}

export default App;

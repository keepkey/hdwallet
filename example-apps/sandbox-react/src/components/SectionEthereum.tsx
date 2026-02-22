"use client";
import React, { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import {
  ethAddr,
  ethTx,
  ethSign,
  ethSend,
  ethVerify,
  ethSignTypedData,
  openSeaListNFTMessage,
  eip712,
} from "@/handlers/chains";

export function SectionEthereum() {
  const { wallet, setResult, results } = useWallet();
  const section = "eth";
  const [ethEIP1559Selected, setEthEIP1559Selected] = useState(false);

  return (
    <div className="container">
      <h4>Ethereum</h4>
      <div style={{ flexWrap: "wrap", display: "flex", gap: "0.25rem", marginBottom: "0.5rem" }}>
        <button type="button" onClick={() => ethAddr(wallet, setResult, section)}>Address</button>
        <button type="button" onClick={() => ethTx(wallet, setResult, section, ethEIP1559Selected)}>Tx</button>
        <button
          type="button"
          className={ethEIP1559Selected ? "primary" : ""}
          onClick={() => setEthEIP1559Selected((v) => !v)}
        >
          EIP-1559?
        </button>
        <button type="button" onClick={() => ethSend(wallet, setResult, section, ethEIP1559Selected)}>Send</button>
        <button type="button" onClick={() => ethSign(wallet, setResult, section)}>Sign Message</button>
        <button type="button" onClick={() => ethVerify(wallet, setResult, section)}>Verify</button>
        <button type="button" onClick={() => ethSignTypedData(wallet, setResult, section, openSeaListNFTMessage)}>
          Sign Typed Data (OpenSea Listing)
        </button>
        <button
          type="button"
          onClick={() =>
            ethSignTypedData(wallet, setResult, section, eip712.longPrimaryTypeString.typedData)
          }
        >
          Sign Typed Data (primaryType is 80+ chars)
        </button>
        <button
          type="button"
          onClick={() =>
            ethSignTypedData(wallet, setResult, section, eip712.EIP712DomainIsPrimaryType.typedData)
          }
        >
          Sign Typed Data (primaryType is &quot;EIP712Domain&quot;)
        </button>
      </div>
      <input type="text" value={results[section] ?? ""} readOnly />
    </div>
  );
}

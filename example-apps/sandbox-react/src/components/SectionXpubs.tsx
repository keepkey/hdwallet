"use client";
import React from "react";
import { useWallet } from "@/context/WalletContext";
import { getXpubs } from "@/handlers/manage";

const COINS = ["Bitcoin", "Dogecoin", "Litecoin", "BitcoinCash", "Ethereum"] as const;

export function SectionXpubs() {
  const { wallet, setResult, results } = useWallet();

  return (
    <div className="container">
      <h4>Xpubs</h4>
      <div style={{ flexWrap: "wrap", display: "flex", gap: "0.25rem", marginBottom: "0.5rem" }}>
        {COINS.map((coin) => (
          <button
            key={coin}
            type="button"
            onClick={() => getXpubs(wallet, setResult, "xpub", coin.replace(/\s/g, ""))}
          >
            {coin}
          </button>
        ))}
      </div>
      <input type="text" value={results.xpub ?? ""} readOnly />
    </div>
  );
}

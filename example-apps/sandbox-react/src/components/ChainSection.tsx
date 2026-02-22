"use client";

import React from "react";
import type { HDWallet } from "@keepkey/hdwallet-core";
import { useWallet } from "@/context/WalletContext";
import type { SetResult } from "@/handlers/types";

export type ButtonDef = {
  label: string;
  action: (wallet: HDWallet | null, setResult: SetResult, section: string) => void;
};

export type SubSection = {
  subtitle?: string;
  section: string;
  buttons: ButtonDef[];
};

export type ChainSectionProps = {
  title: string;
  subsections: SubSection[];
};

export function ChainSection({ title, subsections }: ChainSectionProps) {
  const { wallet, setResult, results } = useWallet();

  return (
    <div className="container">
      <h4>{title}</h4>
      {subsections.map((sub, i) => (
        <React.Fragment key={sub.section}>
          {i > 0 && <hr />}
          {sub.subtitle && <h5>{sub.subtitle}</h5>}
          <div style={{ flexWrap: "wrap", display: "flex", gap: "0.25rem", marginBottom: "0.5rem" }}>
            {sub.buttons.map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={() => btn.action(wallet, setResult, sub.section)}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <input type="text" value={results[sub.section] ?? ""} readOnly />
        </React.Fragment>
      ))}
    </div>
  );
}

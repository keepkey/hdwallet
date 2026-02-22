"use client";
import React, { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { erc20Submit, type Erc20Action } from "@/handlers/chains";

const ACTIONS: { id: Erc20Action; fields: string[] }[] = [
  { id: "Address", fields: [] },
  { id: "Allowance", fields: ["contractAddress", "ownerAddress", "spenderAddress"] },
  { id: "Approve", fields: ["contractAddress", "spenderAddress", "amount"] },
  { id: "Balance Of", fields: ["contractAddress", "accountAddress"] },
  { id: "Total Supply", fields: ["contractAddress"] },
  { id: "Transfer", fields: ["contractAddress", "recipientAddress", "amount"] },
  { id: "Transfer From", fields: ["contractAddress", "senderAddress", "recipientAddress", "amount"] },
];

const FIELD_LABELS: Record<string, string> = {
  contractAddress: "Contract Address",
  ownerAddress: "Owner Address",
  spenderAddress: "Spender Address",
  accountAddress: "Account Address",
  recipientAddress: "Recipient Address",
  senderAddress: "Sender Address",
  amount: "Amount",
};

export function SectionErc20() {
  const { wallet, setResult, results } = useWallet();
  const section = "erc20";
  const [selected, setSelected] = useState<Erc20Action>("Address");
  const [form, setForm] = useState<Record<string, string>>({});

  const current = ACTIONS.find((a) => a.id === selected)!;
  const updateForm = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="container">
      <h4>ERC-20</h4>
      <div style={{ flexWrap: "wrap", display: "flex", gap: "0.25rem", marginBottom: "0.5rem" }}>
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={selected === a.id ? "primary" : ""}
            onClick={() => setSelected(a.id)}
          >
            {a.id === "Balance Of" ? "Balance Of" : a.id}
          </button>
        ))}
      </div>
      <p style={{ fontSize: "0.85rem", color: "#666" }}>
        Select an option from the above row. Fill fields below and click Submit.
      </p>
      <div className="erc20-dynamic">
        {current.fields.map((field) => (
          <input
            key={field}
            type="text"
            placeholder={FIELD_LABELS[field] ?? field}
            value={form[field] ?? ""}
            onChange={(e) => updateForm(field, e.target.value)}
          />
        ))}
      </div>
      <textarea
        disabled
        placeholder="Result"
        value={results[section] ?? ""}
        readOnly
        rows={4}
        style={{ width: "100%", maxWidth: "100%", marginTop: "0.5rem" }}
      />
      <button
        type="button"
        className="primary"
        onClick={() => erc20Submit(wallet, setResult, section, selected, form)}
      >
        Submit
      </button>
    </div>
  );
}

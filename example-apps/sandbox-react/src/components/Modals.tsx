"use client";

import React, { useState } from "react";
import { useWallet } from "@/context/WalletContext";

export function PinModal() {
  const { pinOpen, closePin, onPinEntered } = useWallet();
  const [pin, setPin] = useState("");

  if (!pinOpen) return null;

  const handleDigit = (digit: string) => {
    if (digit === "") setPin((p) => p.slice(0, -1));
    else setPin((p) => p + digit);
  };

  const submit = () => {
    onPinEntered(pin);
    setPin("");
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-dialog">
        <div className="modal-header">
          <h3>Enter PIN</h3>
          <p>Use the PIN layout shown on your device to find the location to press on this PIN pad.</p>
        </div>
        <div className="modal-body">
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 3rem)",
            gridTemplateRows: "repeat(3, 3rem)",
            gap: "0.5rem",
            justifyContent: "center",
            marginBottom: "0.75rem",
          }}>
            {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((d) => (
              <button
                key={d}
                type="button"
                className="button-outline"
                style={{ width: "3rem", height: "3rem", padding: 0, fontSize: "1.25rem", lineHeight: 1 }}
                onClick={() => handleDigit(String(d))}
              >
                &#x25CF;
              </button>
            ))}
          </div>
          <input type="text" value={pin} readOnly style={{ WebkitTextSecurity: "disc", marginBottom: "0.5rem" } as React.CSSProperties} />
          <button type="button" onClick={() => handleDigit("")}>
            x
          </button>
        </div>
        <div className="modal-footer">
          <button type="button" onClick={submit}>
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}

export function PassphraseModal() {
  const { passphraseOpen, closePassphrase, onPassphraseEntered } = useWallet();
  const [passphrase, setPassphrase] = useState("");

  if (!passphraseOpen) return null;

  const submit = () => {
    onPassphraseEntered(passphrase);
    setPassphrase("");
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-dialog">
        <div className="modal-header">
          <h3>Enter Passphrase</h3>
          <p>Enter your BIP39 Passphrase.</p>
        </div>
        <div className="modal-body">
          <input
            type="password"
            autoComplete="bip39-passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
          />
        </div>
        <div className="modal-footer">
          <button type="button" onClick={submit}>
            Unlock
          </button>
        </div>
      </div>
    </div>
  );
}

export function MnemonicModal() {
  const { mnemonicOpen, closeMnemonic, onMnemonicEntered, onUseTestWallet } = useWallet();
  const [mnemonic, setMnemonic] = useState("");

  if (!mnemonicOpen) return null;

  const submit = () => {
    onMnemonicEntered(mnemonic);
    setMnemonic("");
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-dialog">
        <div className="modal-header">
          <h3>Mnemonic Required</h3>
          <p>Enter your mnemonic phrase</p>
        </div>
        <div className="modal-body">
          <input type="text" value={mnemonic} onChange={(e) => setMnemonic(e.target.value)} />
        </div>
        <div className="modal-footer">
          <button type="button" onClick={submit}>
            Load mnemonic
          </button>
          <button type="button" onClick={() => onUseTestWallet()}>
            Use test wallet
          </button>
        </div>
      </div>
    </div>
  );
}

# HDWallet Sandbox (React)

React version of the HDWallet sandbox example. Same features and functionality as the [jQuery sandbox](../sandbox), built with **Vite**, **React 18**, and **TypeScript**.

## Features

- **Pair devices**: KeepKey (WebUSB), KKBridge, Emulator, Native
- **Event log**: Keyring and transport events
- **DebugLink**: Yes / No / Cancel for device prompts
- **Manage**: Vendor, Model, DeviceID, Firmware, Label, All xpubs, Ping, Wipe, Load, Clear Session, Disconnect
- **Xpubs**: Per-coin public keys (Bitcoin, Dogecoin, Litecoin, Bitcoin Cash, Ethereum)
- **Chains**: Eos, Binance, Ripple, Cosmos, Osmosis, Arkeo, MAYAChain, THORChain, Ethereum, ERC-20, Bitcoin (incl. SegWit), Litecoin, Dogecoin, Bitcoin Cash, Dash, DigiByte
- **Modals**: PIN, Passphrase, Mnemonic (with “Use test wallet”)

## Run

This app is **standalone** and uses **npm** (the rest of the repo uses yarn). From this directory:

```bash
npm install
npm run dev
```

Or from the repo root: `yarn dev:sandbox-react` (root script runs `npm run dev` here).

Then open the URL shown (e.g. `http://localhost:5173`).

## Build

```bash
npm run build
```

Output is in `dist/`.

## Structure

- `src/context/WalletContext.tsx` – Keyring, wallet state, event log, modals
- `src/handlers/` – Wallet operations (manage, debugLink, chains)
- `src/components/` – UI sections and modals
- `src/json/` – Test transaction and typed data payloads (mirrors sandbox)

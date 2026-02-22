"use client";

import * as core from "@keepkey/hdwallet-core";
import * as keepkey from "@keepkey/hdwallet-keepkey";
import * as keepkeyTcp from "@keepkey/hdwallet-keepkey-tcp";
import * as keepkeyWebUSB from "@keepkey/hdwallet-keepkey-webusb";
import * as native from "@keepkey/hdwallet-native";
import type { HDWallet } from "@keepkey/hdwallet-core";
import React, { useCallback, useEffect, useRef, useState } from "react";

const keyring = new core.Keyring();

const keepkeyAdapter = keepkeyWebUSB.WebUSBKeepKeyAdapter.useKeyring(keyring);
const kkbridgeAdapter = keepkeyTcp.TCPKeepKeyAdapter.useKeyring(keyring);
const kkemuAdapter = keepkeyTcp.TCPKeepKeyAdapter.useKeyring(keyring);
const nativeAdapter = native.NativeAdapter.useKeyring(keyring);

export type DeviceEntry = { id: string; label: string };

export type WalletContextValue = {
  wallet: HDWallet | null;
  devices: DeviceEntry[];
  selectedDeviceId: string | null;
  selectDevice: (deviceId: string | null) => Promise<void>;
  pairKeepKey: () => Promise<void>;
  pairKKBridge: () => Promise<void>;
  pairEmulator: () => Promise<void>;
  pairNative: () => Promise<void>;
  eventLog: string[];
  addEvent: (entry: string) => void;
  results: Record<string, string>;
  setResult: (section: string, value: string) => void;
  pinOpen: boolean;
  passphraseOpen: boolean;
  mnemonicOpen: boolean;
  openPin: () => void;
  closePin: () => void;
  openPassphrase: () => void;
  closePassphrase: () => void;
  openMnemonic: () => void;
  closeMnemonic: () => void;
  onPinEntered: (pin: string) => void;
  onPassphraseEntered: (passphrase: string) => void;
  onMnemonicEntered: (mnemonic: string) => void;
  onUseTestWallet: () => void;
};

const WalletContext = React.createContext<WalletContextValue | null>(null);

const testPublicWalletXpubs = [
  "xpub661MyMwAqRbcFLgDU7wpcEVubSF7NkswwmXBUkDiGUW6uopeUMys4AqKXNgpfZKRTLnpKQgffd6a2c3J8JxLkF1AQN17Pm9QYHEqEfo1Rsx",
  "xpub68Zyu13qjcQxDzLNfTYnUXtJuX2qJgnxP6osrcAvJGdo6bs9M2Adt2BunbwiYrZS5qpA1QKoMf3uqS2NHpbyZp4KMJxDrL58NTyvHXBeAv6",
  "xpub6APRH5kELakva27TFbzpfhfsY3Jd4dRGo7NocHb63qWecSgK2dUkjWaYevJsCunicpdAkPg9fvHAdpSFMDCMCDMit8kiTM1w9QoGmfyVwDo",
  "xpub6BiVtCpG9fQPxnPmHXG8PhtzQdWC2Su4qWu6XW9tpWFYhxydCLJGrWBJZ5H6qTAHdPQ7pQhtpjiYZVZARo14qHiay2fvrX996oEP42u8wZy",
  "xpub6APRH5kELakyDsZMmBU9HEoeRUzM9F8STp6ztXLPUJQLiXGrbsfACbngkw5vySPfa9vFs2p3kMsRPxhyDTLhKYEf5HLVfDcDuTTazgzvArk",
  "xpub6CNFa58kEQJu2hwMVoofpDEKVVSg6gfwqBqE2zHAianaUnQkrJzJJ42iLDp7Dmg2aP88qCKoFZ4jidk3tECdQuF4567NGHDfe7iBRwHxgke",
  "xpub68Zyu13qjcQxUZiesSWiHJMqkg8G8Guft6MvDhwP72zSYXr9iKnNmDo7LxuSVwtpamrNwGQHkGDWoK8MAp3S9GW5fVxsjBY6AdvZc1hB7kK",
  "xpub6AA5piovovuKytxa5QtBWAbixSjg7fbmu5gqs6QmvARrUMgewJV51roNH4M7GtvZmjBY1m5oAgAjoHivasewSh4S2H7LAikCyuhJxfHdSsK",
  "xpub6CVKsQYXc9awxgV1tWbG4foDvdcnieK2JkbpPEBKB5WwAPKBZ1mstLbKVB4ov7QzxzjaxNK6EfmNY5Jsk2cG26EVcEkycGW4tchT2dyUhrx",
  "xpub68Zyu13qjcQz2DTzkBfLNCfsCTgT39rsUY9JT7MFvG3oEJvS8gUYwRX4RheUTFGZ6EtW4dFYhCdBX32GHJCodkQLAARjNsw4Drj1oDxvo9p",
  "xpub69s3dQnszuX49hTwhNAQEMJyTcRQNZyhtKAqNgQXApquzXdR3fEjXg75ScXzMMMLkUjQnz2Giwt2L7vesiswkAYwzbHezaUXayU8Z81CW56",
  "xpub6DDUPHpUo4pcy43iJeZjbSVWGav1SMMmuWdMHiGtkK8rhKmfbomtkwW6GKs1GGAKehT6QRocrmda3WWxXawpjmwaUHfFRXuKrXSapdckEYF",
].join(" ");

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWalletState] = useState<HDWallet | null>(null);
  const [devices, setDevices] = useState<DeviceEntry[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, string>>({});
  const [pinOpen, setPinOpen] = useState(false);
  const [passphraseOpen, setPassphraseOpen] = useState(false);
  const [mnemonicOpen, setMnemonicOpen] = useState(false);
  const walletRef = useRef<HDWallet | null>(null);

  const addEvent = useCallback((entry: string) => {
    setEventLog((prev) => [...prev.slice(-199), entry]);
  }, []);

  const setResult = useCallback((section: string, value: string) => {
    setResults((prev) => ({ ...prev, [section]: value }));
  }, []);

  const deviceConnected = useCallback(
    async (deviceId: string) => {
      const w = keyring.get(deviceId);
      if (!w) return;
      const label = await w.getVendor();
      setDevices((prev) => {
        if (prev.some((d) => d.id === deviceId)) return prev;
        return [...prev, { id: deviceId, label: `${deviceId} - ${label}` }];
      });
    },
    []
  );

  useEffect(() => {
    keyring.onAny((name: string[], ...values: unknown[]) => {
      const [[_deviceId, event]] = values as [string, { from_wallet?: boolean; message_type?: string }][];
      const { from_wallet = false, message_type } = event ?? {};
      const direction = from_wallet ? "🔑" : "💻";
      addEvent(`Event: ${name.join(".")} | ${direction} ${message_type ?? ""} | ${JSON.stringify(values)}`);
    });

    keyring.on(["*", "*", core.Events.CONNECT], (deviceId: string) => {
      deviceConnected(deviceId);
    });

    keyring.on(["*", "*", core.Events.DISCONNECT], (deviceId: string) => {
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      if (selectedDeviceId === deviceId) {
        setSelectedDeviceId(null);
        setWalletState(null);
        walletRef.current = null;
      }
    });

    keyring.on(["*", "*", core.Events.PIN_REQUEST], () => setPinOpen(true));
    keyring.on(["*", "*", core.Events.PASSPHRASE_REQUEST], () => setPassphraseOpen(true));
    if (native.NativeEvents?.MNEMONIC_REQUIRED) {
      keyring.on(["*", "*", native.NativeEvents.MNEMONIC_REQUIRED], () => setMnemonicOpen(true));
    }
  }, [addEvent, deviceConnected, selectedDeviceId]);

  useEffect(() => {
    (async () => {
      try {
        await kkbridgeAdapter.pairDevice("http://localhost:1646");
      } catch {
        // ignore
      }
      try {
        await nativeAdapter.initialize();
      } catch {
        // ignore
      }
      for (const deviceID of Object.keys(keyring.wallets)) {
        await deviceConnected(deviceID);
      }
      const w = keyring.get();
      if (w) {
        const deviceID = await w.getDeviceID();
        setSelectedDeviceId(deviceID);
        setWalletState(w);
        walletRef.current = w;
      }
    })();
  }, [deviceConnected]);

  const selectDevice = useCallback(
    async (deviceId: string | null) => {
      if (walletRef.current) {
        await walletRef.current.disconnect();
      }
      if (!deviceId) {
        setWalletState(null);
        walletRef.current = null;
        setSelectedDeviceId(null);
        return;
      }
      const w = keyring.get(deviceId);
      if (!w) {
        setSelectedDeviceId(deviceId);
        setWalletState(null);
        walletRef.current = null;
        return;
      }
      if (w.transport) {
        await w.transport.connect();
        if (keepkey.isKeepKey(w)) {
          await w.transport.tryConnectDebugLink?.();
        }
      }
      const model = await w.getModel();
      if (model !== "Native") {
        await w.initialize();
      }
      setWalletState(w);
      walletRef.current = w;
      setSelectedDeviceId(deviceId);
    },
    []
  );

  const pairKeepKey = useCallback(async () => {
    const w = await keepkeyAdapter.pairDevice(undefined, true);
    walletRef.current = w;
    setWalletState(w);
    const deviceID = await w.transport.getDeviceID();
    setSelectedDeviceId(deviceID);
    await deviceConnected(deviceID);
  }, [deviceConnected]);

  const pairKKBridge = useCallback(async () => {
    const w = await kkbridgeAdapter.pairDevice("http://localhost:1646");
    walletRef.current = w;
    setWalletState(w);
    const deviceID = await w.transport.getDeviceID();
    setSelectedDeviceId(deviceID);
    await deviceConnected(deviceID);
  }, [deviceConnected]);

  const pairEmulator = useCallback(async () => {
    const w = await kkemuAdapter.pairDevice("http://localhost:5000");
    walletRef.current = w;
    setWalletState(w);
    const deviceID = await w.transport.getDeviceID();
    setSelectedDeviceId(deviceID);
    await deviceConnected(deviceID);
  }, [deviceConnected]);

  const pairNative = useCallback(async () => {
    const w = await nativeAdapter.pairDevice("testid");
    walletRef.current = w;
    setWalletState(w);
    const deviceID = await w.getDeviceID();
    setSelectedDeviceId(deviceID);
    await deviceConnected(deviceID);
  }, [deviceConnected]);

  const onPinEntered = useCallback(
    (pin: string) => {
      walletRef.current?.sendPin(pin);
      setPinOpen(false);
    },
    []
  );

  const onPassphraseEntered = useCallback(
    (passphrase: string) => {
      walletRef.current?.sendPassphrase(passphrase);
      setPassphraseOpen(false);
    },
    []
  );

  const onMnemonicEntered = useCallback(
    (mnemonic: string) => {
      walletRef.current?.loadDevice?.({ mnemonic });
      setMnemonicOpen(false);
    },
    []
  );

  const onUseTestWallet = useCallback(async () => {
    if (!walletRef.current?.loadDevice) return;
    const mnemonic = await (native.crypto as unknown as { Isolation: { Engines: { Dummy: { BIP39: { Mnemonic: { create: (x: string) => Promise<string> } } } } } })
      .Isolation.Engines.Dummy.BIP39.Mnemonic.create(testPublicWalletXpubs);
    walletRef.current.loadDevice({ mnemonic });
    setMnemonicOpen(false);
  }, []);

  const value: WalletContextValue = {
    wallet,
    devices,
    selectedDeviceId,
    selectDevice,
    pairKeepKey,
    pairKKBridge,
    pairEmulator,
    pairNative,
    eventLog,
    addEvent,
    results,
    setResult,
    pinOpen,
    passphraseOpen,
    mnemonicOpen,
    openPin: () => setPinOpen(true),
    closePin: () => setPinOpen(false),
    openPassphrase: () => setPassphraseOpen(true),
    closePassphrase: () => setPassphraseOpen(false),
    openMnemonic: () => setMnemonicOpen(true),
    closeMnemonic: () => setMnemonicOpen(false),
    onPinEntered,
    onPassphraseEntered,
    onMnemonicEntered,
    onUseTestWallet,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = React.useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

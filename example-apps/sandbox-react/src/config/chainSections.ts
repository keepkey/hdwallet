import type { ChainSectionProps } from "@/components/ChainSection";
import {
  eosAddr, eosTx,
  binanceAddr, binanceTx,
  rippleAddr, rippleTx,
  cosmosAddr, cosmosTx, cosmosDelegate, cosmosUndelegate, cosmosRedelegate, cosmosRewards, cosmosIBCTransfer,
  osmosisAddress, osmosisSend, osmosisDelegate, osmosisUndelegate, osmosisRedelegate, osmosisRewards,
  osmosisLPAdd, osmosisLPRemove, osmosisIBCTransfer, osmosisSwap,
  arkeoGetAddress, arkeoBondProvider, arkeoModProvider, arkeoOpenContract, arkeoCloseContract,
  arkeoClaimContractIncome, arkeoClaimETH, arkeoClaimArkeo, arkeoTransferClaim, arkeoAddClaim,
  mayachainAddr, mayachainTx,
  thorchainAddr, thorchainTx,
  thorchainArkeoBondProvider, thorchainArkeoModProvider, thorchainArkeoOpenContract,
  thorchainArkeoCloseContract, thorchainArkeoClaimContractIncome, thorchainArkeoClaimEth,
  thorchainArkeoClaimArkeo, thorchainArkeoTransferClaim, thorchainArkeoAddClaim,
  btcAddr, btcTx, btcSign, btcVerify,
  btcAddrSegWit, btcAddrSegWitNative, btcTxSegWit, btcTxSegWitNative,
  ltcAddr, ltcTx, ltcSign,
  dogeAddr, dogeTx,
  bchAddr, bchTx,
  dashAddr, dashTx,
  dgbAddr, dgbTx,
} from "@/handlers/chains";

export const chainSections: ChainSectionProps[] = [
  {
    title: "Eos",
    subsections: [{ section: "eos", buttons: [
      { label: "Address", action: eosAddr },
      { label: "Tx", action: eosTx },
    ]}],
  },
  {
    title: "Binance",
    subsections: [{ section: "binance", buttons: [
      { label: "Address", action: binanceAddr },
      { label: "Tx", action: binanceTx },
    ]}],
  },
  {
    title: "Ripple",
    subsections: [{ section: "ripple", buttons: [
      { label: "Address", action: rippleAddr },
      { label: "Tx", action: rippleTx },
    ]}],
  },
  {
    title: "Cosmos",
    subsections: [{ section: "cosmos", buttons: [
      { label: "Address", action: cosmosAddr },
      { label: "Tx", action: cosmosTx },
      { label: "Delegate", action: cosmosDelegate },
      { label: "Undelegate", action: cosmosUndelegate },
      { label: "Redelegate", action: cosmosRedelegate },
      { label: "Rewards", action: cosmosRewards },
      { label: "IBC Transfer", action: cosmosIBCTransfer },
    ]}],
  },
  {
    title: "Osmosis",
    subsections: [{ section: "osmosis", buttons: [
      { label: "Get Address", action: osmosisAddress },
      { label: "Send", action: osmosisSend },
      { label: "Delegate", action: osmosisDelegate },
      { label: "Undelegate", action: osmosisUndelegate },
      { label: "Redelegate", action: osmosisRedelegate },
      { label: "Rewards", action: osmosisRewards },
      { label: "LP Add", action: osmosisLPAdd },
      { label: "LP Remove", action: osmosisLPRemove },
      { label: "IBC Transfer", action: osmosisIBCTransfer },
      { label: "Swap", action: osmosisSwap },
    ]}],
  },
  {
    title: "Arkeo",
    subsections: [{ section: "arkeo", buttons: [
      { label: "Get Address", action: arkeoGetAddress },
      { label: "Bond Provider", action: arkeoBondProvider },
      { label: "Mod Provider", action: arkeoModProvider },
      { label: "Open Contract", action: arkeoOpenContract },
      { label: "Close Contract", action: arkeoCloseContract },
      { label: "Claim Contract Income", action: arkeoClaimContractIncome },
      { label: "Claim ETH", action: arkeoClaimETH },
      { label: "Claim Arkeo", action: arkeoClaimArkeo },
      { label: "Transfer Claim", action: arkeoTransferClaim },
      { label: "Add Claim", action: arkeoAddClaim },
    ]}],
  },
  {
    title: "MAYAChain",
    subsections: [{ subtitle: "Native MAYA", section: "mayachain", buttons: [
      { label: "Address", action: mayachainAddr },
      { label: "Tx", action: mayachainTx },
    ]}],
  },
  {
    title: "THORChain",
    subsections: [
      { subtitle: "Native RUNE", section: "thorchain", buttons: [
        { label: "Address", action: thorchainAddr },
        { label: "Tx", action: thorchainTx },
      ]},
      { subtitle: "Arkeo", section: "thorchainArkeo", buttons: [
        { label: "Bond Provider", action: thorchainArkeoBondProvider },
        { label: "Mod Provider", action: thorchainArkeoModProvider },
        { label: "Open Contract", action: thorchainArkeoOpenContract },
        { label: "Close Contract", action: thorchainArkeoCloseContract },
        { label: "Claim Contract Income", action: thorchainArkeoClaimContractIncome },
        { label: "Claim ETH", action: thorchainArkeoClaimEth },
        { label: "Claim Arkeo", action: thorchainArkeoClaimArkeo },
        { label: "Transfer Claim", action: thorchainArkeoTransferClaim },
        { label: "Add Claim", action: thorchainArkeoAddClaim },
      ]},
    ],
  },
  {
    title: "Bitcoin",
    subsections: [{ section: "btc", buttons: [
      { label: "Address", action: btcAddr },
      { label: "Tx", action: btcTx },
      { label: "Sign", action: btcSign },
      { label: "Verify", action: btcVerify },
    ]}],
  },
  {
    title: "Bitcoin (segwit)",
    subsections: [{ section: "btcSegWit", buttons: [
      { label: "Address (p2wsh)", action: btcAddrSegWit },
      { label: "Address (bech32)", action: btcAddrSegWitNative },
      { label: "Tx Segwit", action: btcTxSegWit },
      { label: "Tx Segwit (Native)", action: btcTxSegWitNative },
    ]}],
  },
  {
    title: "Litecoin",
    subsections: [{ section: "ltc", buttons: [
      { label: "Address", action: ltcAddr },
      { label: "Tx", action: ltcTx },
      { label: "Sign", action: ltcSign },
    ]}],
  },
  {
    title: "Dogecoin",
    subsections: [{ section: "doge", buttons: [
      { label: "Address", action: dogeAddr },
      { label: "Tx", action: dogeTx },
    ]}],
  },
  {
    title: "Bitcoin Cash",
    subsections: [{ section: "bch", buttons: [
      { label: "Address", action: bchAddr },
      { label: "Tx", action: bchTx },
    ]}],
  },
  {
    title: "Dash",
    subsections: [{ section: "dash", buttons: [
      { label: "Address", action: dashAddr },
      { label: "Tx", action: dashTx },
    ]}],
  },
  {
    title: "DigiByte",
    subsections: [{ section: "dgb", buttons: [
      { label: "Address", action: dgbAddr },
      { label: "Tx", action: dgbTx },
    ]}],
  },
];

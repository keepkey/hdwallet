import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as BinanceMessages from "@keepkey/device-protocol/lib/messages-binance_pb";
import * as CosmosMessages from "@keepkey/device-protocol/lib/messages-cosmos_pb";
import * as EosMessages from "@keepkey/device-protocol/lib/messages-eos_pb";
import * as EthereumMessages from "@keepkey/device-protocol/lib/messages-ethereum_pb";
import * as MayachainMessages from "@keepkey/device-protocol/lib/messages-mayachain_pb";
import * as NanoMessages from "@keepkey/device-protocol/lib/messages-nano_pb";
import * as OsmosisMessages from "@keepkey/device-protocol/lib/messages-osmosis_pb";
import * as RippleMessages from "@keepkey/device-protocol/lib/messages-ripple_pb";
import * as SolanaMessages from "@keepkey/device-protocol/lib/messages-solana_pb";
import * as TendermintMessages from "@keepkey/device-protocol/lib/messages-tendermint_pb";
import * as ThorchainMessages from "@keepkey/device-protocol/lib/messages-thorchain_pb";
import * as TonMessages from "@keepkey/device-protocol/lib/messages-ton_pb";
import * as TronMessages from "@keepkey/device-protocol/lib/messages-tron_pb";
import * as ZcashMessages from "@keepkey/device-protocol/lib/messages-zcash_pb";
import * as core from "@keepkey/hdwallet-core";
import * as jspb from "google-protobuf";
function messageEntries(obj: Record<string, unknown>): Array<[string, core.Constructor<jspb.Message>]> {
  return Object.entries(obj).filter(
    (entry): entry is [string, core.Constructor<jspb.Message>] =>
      typeof entry[1] === "function" && entry[1].prototype instanceof jspb.Message
  );
}

const AllMessages = ([] as Array<[string, core.Constructor<jspb.Message>]>)
  .concat(messageEntries(Messages))
  .concat(messageEntries(BinanceMessages))
  .concat(messageEntries(CosmosMessages))
  .concat(messageEntries(EthereumMessages))
  .concat(messageEntries(OsmosisMessages))
  .concat(messageEntries(RippleMessages))
  .concat(messageEntries(NanoMessages))
  .concat(messageEntries(EosMessages))
  .concat(messageEntries(SolanaMessages))
  .concat(messageEntries(TendermintMessages))
  .concat(messageEntries(ThorchainMessages))
  .concat(messageEntries(TonMessages))
  .concat(messageEntries(TronMessages))
  .concat(messageEntries(MayachainMessages))
  .concat(messageEntries(ZcashMessages));

const upperCasedMessageClasses = AllMessages.reduce((registry, entry: [string, core.Constructor<jspb.Message>]) => {
  registry[entry[0].toUpperCase()] = entry[1];
  return registry;
}, {} as Record<string, core.Constructor<jspb.Message>>);

// Map of message type enums to human readable message name
export const messageNameRegistry = Object.entries(Messages.MessageType).reduce((registry, entry: [string, number]) => {
  registry[entry[1]] = entry[0].split("_")[1];
  return registry;
}, {} as Record<number, string>);

// Map of message type enum to their protobuf constructor
export const messageTypeRegistry = Object.entries(Messages.MessageType).reduce((registry, entry: [string, number]) => {
  registry[entry[1]] = upperCasedMessageClasses[entry[0].split("_")[1].toUpperCase()];
  return registry;
}, {} as Record<number, core.Constructor<jspb.Message>>);

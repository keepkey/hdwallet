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

import * as Eip712 from "./eip712Wire";
function omit(obj: Record<string, any>, ...keys: string[]): Record<string, any> {
  const result = { ...obj };
  for (const key of keys) delete result[key];
  return result;
}

// Conflict between typedef and actual js export

const AllMessages = ([] as Array<[string, core.Constructor<jspb.Message>]>)
  .concat(Object.entries(omit(Messages, "MessageType", "MessageTypeMap")))
  .concat(Object.entries(BinanceMessages))
  .concat(Object.entries(CosmosMessages))
  .concat(Object.entries(EthereumMessages))
  .concat(Object.entries(OsmosisMessages))
  .concat(Object.entries(RippleMessages))
  .concat(Object.entries(NanoMessages))
  .concat(Object.entries(omit(EosMessages, "EosPublicKeyKind", "EosPublicKeyKindMap")))
  .concat(Object.entries(SolanaMessages))
  .concat(Object.entries(TendermintMessages))
  .concat(Object.entries(ThorchainMessages))
  .concat(Object.entries(TonMessages))
  .concat(Object.entries(TronMessages))
  .concat(Object.entries(MayachainMessages))
  .concat(Object.entries(omit(ZcashMessages, "ZcashShieldedPool", "ZcashShieldedPoolMap")));

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

/* Structured EIP-712 (message types 1704-1708).
 *
 * These are registered by hand because the published @keepkey/device-protocol
 * package does not carry them yet, so they are absent from Messages.MessageType
 * and the reducers above cannot see them. Without this the transport can send a
 * request but cannot decode the device's reply, and the walk stalls on its
 * first StructRequest.
 *
 * Delete this block when the package ships the generated classes -- the
 * reducers will then pick them up on their own. */
messageNameRegistry[Eip712.MESSAGETYPE_ETHEREUMSIGNTYPEDDATA] = "EthereumSignTypedData";
messageNameRegistry[Eip712.MESSAGETYPE_ETHEREUMTYPEDDATASTRUCTREQUEST] = "EthereumTypedDataStructRequest";
messageNameRegistry[Eip712.MESSAGETYPE_ETHEREUMTYPEDDATASTRUCTACK] = "EthereumTypedDataStructAck";
messageNameRegistry[Eip712.MESSAGETYPE_ETHEREUMTYPEDDATAVALUEREQUEST] = "EthereumTypedDataValueRequest";
messageNameRegistry[Eip712.MESSAGETYPE_ETHEREUMTYPEDDATAVALUEACK] = "EthereumTypedDataValueAck";

messageTypeRegistry[Eip712.MESSAGETYPE_ETHEREUMSIGNTYPEDDATA] =
  Eip712.EthereumSignTypedData as unknown as core.Constructor<jspb.Message>;
messageTypeRegistry[Eip712.MESSAGETYPE_ETHEREUMTYPEDDATASTRUCTREQUEST] =
  Eip712.EthereumTypedDataStructRequest as unknown as core.Constructor<jspb.Message>;
messageTypeRegistry[Eip712.MESSAGETYPE_ETHEREUMTYPEDDATASTRUCTACK] =
  Eip712.EthereumTypedDataStructAck as unknown as core.Constructor<jspb.Message>;
messageTypeRegistry[Eip712.MESSAGETYPE_ETHEREUMTYPEDDATAVALUEREQUEST] =
  Eip712.EthereumTypedDataValueRequest as unknown as core.Constructor<jspb.Message>;
messageTypeRegistry[Eip712.MESSAGETYPE_ETHEREUMTYPEDDATAVALUEACK] =
  Eip712.EthereumTypedDataValueAck as unknown as core.Constructor<jspb.Message>;

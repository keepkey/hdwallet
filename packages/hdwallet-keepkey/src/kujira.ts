import type { AminoSignResponse, OfflineAminoSigner, StdSignDoc, StdTx } from "@cosmjs/amino";
import type { AccountData } from "@cosmjs/proto-signing";
import type { SignerData } from "@cosmjs/stargate";
import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as KujiraMessages from "@keepkey/device-protocol/lib/messages-kujira_pb";
import * as core from "@keepkey/hdwallet-core";
import bs58check from "bs58check";
import PLazy from "p-lazy";

import { Transport } from "./transport";

const protoTxBuilder = PLazy.from(() => import("@keepkey/proto-tx-builder"));

export function kujiraGetAccountPaths(msg: core.KujiraGetAccountPaths): Array<core.KujiraAccountPath> {
  return [
    {
      addressNList: [0x80000000 + 44, 0x80000000 + core.slip44ByCoin("Kuji"), 0x80000000 + msg.accountIdx, 0, 0],
    },
  ];
}

export async function kujiraGetAddress(
  transport: Transport,
  msg: KujiraMessages.KujiraGetAddress.AsObject
): Promise<string> {
  const getAddr = new KujiraMessages.KujiraGetAddress();
  getAddr.setAddressNList(msg.addressNList);
  getAddr.setShowDisplay(msg.showDisplay !== false);
  const response = await transport.call(Messages.MessageType.MESSAGETYPE_KUJIRAGETADDRESS, getAddr, {
    msgTimeout: core.LONG_TIMEOUT,
  });

  const kujiraAddress = response.proto as KujiraMessages.KujiraAddress;
  return core.mustBeDefined(kujiraAddress.getAddress());
}

export async function kujiraSignTx(transport: Transport, msg: core.KujiraSignTx): Promise<any> {
  const address = await kujiraGetAddress(transport, { addressNList: msg.addressNList });

  const getPublicKeyMsg = new Messages.GetPublicKey();
  getPublicKeyMsg.setAddressNList(msg.addressNList);
  getPublicKeyMsg.setEcdsaCurveName("secp256k1");

  const pubkeyMsg = (
    await transport.call(Messages.MessageType.MESSAGETYPE_GETPUBLICKEY, getPublicKeyMsg, {
      msgTimeout: core.DEFAULT_TIMEOUT,
    })
  ).proto as Messages.PublicKey;
  const pubkey = bs58check.decode(core.mustBeDefined(pubkeyMsg.getXpub())).slice(45);

  return transport.lockDuring(async () => {
    const signTx = new KujiraMessages.KujiraSignTx();
    signTx.setAddressNList(msg.addressNList);
    signTx.setAccountNumber(msg.account_number);
    signTx.setChainId(msg.chain_id);
    signTx.setFeeAmount(parseInt(msg.tx.fee.amount[0].amount));
    signTx.setGas(parseInt(msg.tx.fee.gas));
    signTx.setSequence(msg.sequence);
    if (msg.tx.memo !== undefined) {
      signTx.setMemo(msg.tx.memo);
    }
    signTx.setMsgCount(1);

    let resp = await transport.call(Messages.MessageType.MESSAGETYPE_KUJIRASIGNTX, signTx, {
      msgTimeout: core.LONG_TIMEOUT,
      omitLock: true,
    });

    for (const m of msg.tx.msg) {
      if (resp.message_enum !== Messages.MessageType.MESSAGETYPE_KUJIRAMSGREQUEST) {
        throw new Error(`kujira: unexpected response ${resp.message_type}`);
      }

      let ack;

      if (m.type === "cosmos-sdk/MsgSend") {
        if (m.value.amount.length !== 1) {
          throw new Error("kujira: Multiple amounts per msg not supported");
        }

        const denom = m.value.amount[0].denom;
        if (denom !== "ukuji") {
          throw new Error("kujira: Unsupported denomination: " + denom);
        }

        const send = new KujiraMessages.KujiraMsgSend();
        send.setFromAddress(m.value.from_address);
        send.setToAddress(m.value.to_address);
        send.setAmount(m.value.amount[0].amount);

        ack = new KujiraMessages.KujiraMsgAck();
        ack.setSend(send);
      } else if (m.type === "cosmos-sdk/MsgDelegate") {
        const denom = m.value.amount.denom;
        if (denom !== "ukuji") {
          throw new Error("kujira: Unsupported denomination: " + denom);
        }

        const delegate = new KujiraMessages.KujiraMsgDelegate();
        delegate.setDelegatorAddress(m.value.delegator_address);
        delegate.setValidatorAddress(m.value.validator_address);
        delegate.setAmount(m.value.amount.amount);

        ack = new KujiraMessages.KujiraMsgAck();

        ack.setDelegate(delegate);
      } else if (m.type === "cosmos-sdk/MsgUndelegate") {
        const denom = m.value.amount.denom;
        if (denom !== "ukuji") {
          throw new Error("kujira: Unsupported denomination: " + denom);
        }

        const undelegate = new KujiraMessages.KujiraMsgUndelegate();
        undelegate.setDelegatorAddress(m.value.delegator_address);
        undelegate.setValidatorAddress(m.value.validator_address);
        undelegate.setAmount(m.value.amount.amount);

        ack = new KujiraMessages.KujiraMsgAck();
        ack.setUndelegate(undelegate);
      } else if (m.type === "cosmos-sdk/MsgBeginRedelegate") {
        const denom = m.value.amount.denom;
        if (denom !== "ukuji") {
          throw new Error("kujira: Unsupported denomination: " + denom);
        }

        const redelegate = new KujiraMessages.KujiraMsgRedelegate();
        redelegate.setDelegatorAddress(m.value.delegator_address);
        redelegate.setValidatorSrcAddress(m.value.validator_src_address);
        redelegate.setValidatorDstAddress(m.value.validator_dst_address);
        redelegate.setAmount(m.value.amount.amount);

        ack = new KujiraMessages.KujiraMsgAck();
        ack.setRedelegate(redelegate);
      } else if (m.type === "cosmos-sdk/MsgWithdrawDelegationReward") {
        const rewards = new KujiraMessages.KujiraMsgRewards();
        rewards.setDelegatorAddress(m.value.delegator_address);
        rewards.setValidatorAddress(m.value.validator_address);
        if (m.value.amount) {
          const denom = m.value.amount.denom;
          if (denom !== "ukuji") {
            throw new Error("kujira: Unsupported denomination: " + denom);
          }
          rewards.setAmount(m.value.amount.amount);
        }

        ack = new KujiraMessages.KujiraMsgAck();
        ack.setRewards(rewards);
      } else if (m.type === "cosmos-sdk/MsgTransfer") {
        const denom = m.value.token.denom;
        if (denom !== "ukuji") {
          throw new Error("kujira: Unsupported denomination: " + denom);
        }

        const ibcTransfer = new KujiraMessages.KujiraMsgIBCTransfer();
        ibcTransfer.setReceiver(m.value.receiver);
        ibcTransfer.setSender(m.value.sender);
        ibcTransfer.setSourceChannel(m.value.source_channel);
        ibcTransfer.setSourcePort(m.value.source_port);
        ibcTransfer.setRevisionHeight(m.value.timeout_height.revision_height);
        ibcTransfer.setRevisionNumber(m.value.timeout_height.revision_number);
        ibcTransfer.setAmount(m.value.token.amount);
        ibcTransfer.setDenom(m.value.token.denom);

        ack = new KujiraMessages.KujiraMsgAck();
        ack.setIbcTransfer(ibcTransfer);
      } else {
        throw new Error(`kujira: Message ${m.type} is not yet supported`);
      }

      resp = await transport.call(Messages.MessageType.MESSAGETYPE_KUJIRAMSGACK, ack, {
        msgTimeout: core.LONG_TIMEOUT,
        omitLock: true,
      });
    }

    if (resp.message_enum !== Messages.MessageType.MESSAGETYPE_KUJIRASIGNEDTX) {
      throw new Error(`kujira: unexpected response ${resp.message_type}`);
    }

    const signedTx = resp.proto as KujiraMessages.KujiraSignedTx;

    const offlineSigner: OfflineAminoSigner = {
      async getAccounts(): Promise<readonly AccountData[]> {
        return [
          {
            address,
            algo: "secp256k1",
            pubkey,
          },
        ];
      },
      async signAmino(signerAddress: string, signDoc: StdSignDoc): Promise<AminoSignResponse> {
        if (signerAddress !== address) throw new Error("expected signerAddress to match address");
        return {
          signed: signDoc,
          signature: {
            pub_key: {
              type: "tendermint/PubKeySecp256k1",
              value: signedTx.getPublicKey_asB64(),
            },
            signature: signedTx.getSignature_asB64(),
          },
        };
      },
    };

    const signerData: SignerData = {
      sequence: Number(msg.sequence),
      accountNumber: Number(msg.account_number),
      chainId: msg.chain_id,
    };

    return (await protoTxBuilder).sign(address, msg.tx as StdTx, offlineSigner, signerData);
  });
}

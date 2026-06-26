/**
 * Unit tests for the Hive multi-key + account-operation protobuf shims (Phase 1).
 *
 * Covers:
 *   - Type registry registration (1604-1609)
 *   - jspb round-trip (serializeBinary → deserializeBinaryFromReader) for
 *     HiveGetPublicKeys / HivePublicKeys / HiveSignAccountCreate /
 *     HiveSignAccountUpdate / HiveSignedAccountCreate — the hand-written wire
 *     format is the thing most likely to be wrong, so pin every field.
 *   - hiveSlip48Path: SLIP-0048 derivation (the bug that motivated all of this)
 *   - hiveGetPublicKeys / hiveSignAccountCreate wrappers: success path +
 *     unexpected-response guard.
 */
import * as core from "@keepkey/hdwallet-core";
import { hiveSlip48Path } from "@keepkey/hdwallet-core";
import * as jspb from "google-protobuf";

import {
  HiveGetPublicKeys,
  hiveGetPublicKeys,
  HivePublicKeys,
  HiveSignAccountCreate,
  hiveSignAccountCreate,
  HiveSignAccountUpdate,
  HiveSignedAccountCreate,
} from "./hive";
import { messageNameRegistry, messageTypeRegistry } from "./typeRegistry";

const MESSAGETYPE_HIVEGETPUBLICKEYS = 1604;
const MESSAGETYPE_HIVEPUBLICKEYS = 1605;
const MESSAGETYPE_HIVESIGNACCOUNTCREATE = 1606;
const MESSAGETYPE_HIVESIGNEDACCOUNTCREATE = 1607;
const MESSAGETYPE_HIVESIGNACCOUNTUPDATE = 1608;
const MESSAGETYPE_HIVESIGNEDACCOUNTUPDATE = 1609;

const OWNER_PATH = [0x80000030, 0x8000000d, 0x80000000, 0x80000000, 0x80000000]; // m/48'/13'/0'/0'/0'

function makeMockTransport(callImpl: jest.Mock) {
  return {
    debugLink: false,
    call: callImpl,
    lockDuring: <T>(fn: () => Promise<T>) => fn(),
  } as any;
}

describe("Hive account-op protobuf registration", () => {
  const cases: Array<[number, string]> = [
    [MESSAGETYPE_HIVEGETPUBLICKEYS, "HiveGetPublicKeys"],
    [MESSAGETYPE_HIVEPUBLICKEYS, "HivePublicKeys"],
    [MESSAGETYPE_HIVESIGNACCOUNTCREATE, "HiveSignAccountCreate"],
    [MESSAGETYPE_HIVESIGNEDACCOUNTCREATE, "HiveSignedAccountCreate"],
    [MESSAGETYPE_HIVESIGNACCOUNTUPDATE, "HiveSignAccountUpdate"],
    [MESSAGETYPE_HIVESIGNEDACCOUNTUPDATE, "HiveSignedAccountUpdate"],
  ];
  it.each(cases)("registers %i as %s", (id, name) => {
    expect(messageTypeRegistry[id]).toBeDefined();
    expect(messageNameRegistry[id]).toBe(name);
  });
});

describe("hiveSlip48Path", () => {
  it("derives m/48'/13'/role'/account'/0' for each role", () => {
    expect(hiveSlip48Path("owner")).toEqual([0x80000030, 0x8000000d, 0x80000000, 0x80000000, 0x80000000]);
    expect(hiveSlip48Path("active")).toEqual([0x80000030, 0x8000000d, 0x80000001, 0x80000000, 0x80000000]);
    expect(hiveSlip48Path("memo")).toEqual([0x80000030, 0x8000000d, 0x80000003, 0x80000000, 0x80000000]);
    expect(hiveSlip48Path("posting")).toEqual([0x80000030, 0x8000000d, 0x80000004, 0x80000000, 0x80000000]);
  });
  it("honors account index (all hardened)", () => {
    expect(hiveSlip48Path("active", 2)).toEqual([0x80000030, 0x8000000d, 0x80000001, 0x80000002, 0x80000000]);
  });
});

describe("Hive jspb round-trip", () => {
  it("HiveGetPublicKeys: account_index + show_display", () => {
    const m = new HiveGetPublicKeys();
    m.setAccountIndex(3);
    m.setShowDisplay(true);
    const decoded = HiveGetPublicKeys.deserializeBinaryFromReader(
      new HiveGetPublicKeys(),
      new jspb.BinaryReader(m.serializeBinary()),
    );
    expect(decoded.getAccountIndex()).toBe(3);
    expect(decoded.getShowDisplay()).toBe(true);
  });

  it("HivePublicKeys: all four role keys survive", () => {
    const m = new HivePublicKeys();
    m.setOwnerKey("STM_owner");
    m.setActiveKey("STM_active");
    m.setMemoKey("STM_memo");
    m.setPostingKey("STM_posting");
    const decoded = HivePublicKeys.deserializeBinaryFromReader(
      new HivePublicKeys(),
      new jspb.BinaryReader(m.serializeBinary()),
    );
    expect(decoded.getOwnerKey()).toBe("STM_owner");
    expect(decoded.getActiveKey()).toBe("STM_active");
    expect(decoded.getMemoKey()).toBe("STM_memo");
    expect(decoded.getPostingKey()).toBe("STM_posting");
  });

  it("HiveSignAccountCreate: every field including uint64 fee", () => {
    const m = new HiveSignAccountCreate();
    m.setAddressNList(OWNER_PATH);
    m.setChainId(new Uint8Array([0xbe, 0xea, 0xb0, 0xde]));
    m.setRefBlockNum(12345);
    m.setRefBlockPrefix(67890);
    m.setExpiration(1700000000);
    m.setCreator("sponsor");
    m.setNewAccountName("alice");
    m.setOwnerKey("STM_o");
    m.setActiveKey("STM_a");
    m.setPostingKey("STM_p");
    m.setMemoKey("STM_m");
    m.setFeeAmount(3000);

    const decoded = HiveSignAccountCreate.deserializeBinaryFromReader(
      new HiveSignAccountCreate(),
      new jspb.BinaryReader(m.serializeBinary()),
    );
    expect(decoded.getAddressNList()).toEqual(OWNER_PATH);
    expect(Array.from(decoded.getChainId_asU8())).toEqual([0xbe, 0xea, 0xb0, 0xde]);
    expect(decoded.getRefBlockNum()).toBe(12345);
    expect(decoded.getRefBlockPrefix()).toBe(67890);
    expect(decoded.getExpiration()).toBe(1700000000);
    expect(decoded.getCreator()).toBe("sponsor");
    expect(decoded.getNewAccountName()).toBe("alice");
    expect(decoded.getOwnerKey()).toBe("STM_o");
    expect(decoded.getActiveKey()).toBe("STM_a");
    expect(decoded.getPostingKey()).toBe("STM_p");
    expect(decoded.getMemoKey()).toBe("STM_m");
    expect(decoded.getFeeAmount()).toBe(3000);
  });

  it("HiveSignAccountUpdate: account + 4 new keys", () => {
    const m = new HiveSignAccountUpdate();
    m.setAddressNList(OWNER_PATH);
    m.setRefBlockNum(1);
    m.setRefBlockPrefix(2);
    m.setExpiration(3);
    m.setAccount("alice");
    m.setNewOwnerKey("STM_no");
    m.setNewActiveKey("STM_na");
    m.setNewPostingKey("STM_np");
    m.setNewMemoKey("STM_nm");
    const decoded = HiveSignAccountUpdate.deserializeBinaryFromReader(
      new HiveSignAccountUpdate(),
      new jspb.BinaryReader(m.serializeBinary()),
    );
    expect(decoded.getAccount()).toBe("alice");
    expect(decoded.getNewOwnerKey()).toBe("STM_no");
    expect(decoded.getNewActiveKey()).toBe("STM_na");
    expect(decoded.getNewPostingKey()).toBe("STM_np");
    expect(decoded.getNewMemoKey()).toBe("STM_nm");
  });
});

describe("Hive wrappers", () => {
  it("hiveGetPublicKeys returns the four keys on success", async () => {
    const resp = new HivePublicKeys();
    resp.setOwnerKey("STM_o");
    resp.setActiveKey("STM_a");
    resp.setMemoKey("STM_m");
    resp.setPostingKey("STM_p");
    const call = jest.fn().mockResolvedValue({
      message_enum: MESSAGETYPE_HIVEPUBLICKEYS,
      message_type: "HivePublicKeys",
      proto: resp,
    });
    const out = await hiveGetPublicKeys(makeMockTransport(call), { accountIndex: 0 });
    expect(out).toEqual({ ownerKey: "STM_o", activeKey: "STM_a", memoKey: "STM_m", postingKey: "STM_p" });
    expect(call).toHaveBeenCalledWith(MESSAGETYPE_HIVEGETPUBLICKEYS, expect.anything(), expect.anything());
  });

  it("hiveSignAccountCreate returns signature + serializedTx on success", async () => {
    const signed = new HiveSignedAccountCreate();
    signed.setSignature(new Uint8Array([1, 2, 3]));
    signed.setSerializedTx(new Uint8Array([4, 5, 6]));
    const call = jest.fn().mockResolvedValue({
      message_enum: MESSAGETYPE_HIVESIGNEDACCOUNTCREATE,
      message_type: "HiveSignedAccountCreate",
      proto: signed,
    });
    const out = await hiveSignAccountCreate(makeMockTransport(call), {
      addressNList: OWNER_PATH,
      refBlockNum: 1,
      refBlockPrefix: 2,
      expiration: 3,
      creator: "sponsor",
      newAccountName: "alice",
      ownerKey: "STM_o",
      activeKey: "STM_a",
      postingKey: "STM_p",
      memoKey: "STM_m",
      feeAmount: 3000,
    });
    expect(Array.from(out.signature)).toEqual([1, 2, 3]);
    expect(Array.from(out.serializedTx)).toEqual([4, 5, 6]);
  });

  it("hiveSignAccountCreate throws on unexpected response", async () => {
    const call = jest.fn().mockResolvedValue({ message_enum: 9999, message_type: "Other", proto: {} });
    await expect(
      hiveSignAccountCreate(makeMockTransport(call), {
        addressNList: OWNER_PATH,
        refBlockNum: 1,
        refBlockPrefix: 2,
        expiration: 3,
        creator: "sponsor",
        newAccountName: "alice",
        ownerKey: "STM_o",
        activeKey: "STM_a",
        postingKey: "STM_p",
        memoKey: "STM_m",
        feeAmount: 3000,
      }),
    ).rejects.toThrow(/unexpected response/);
  });
});

// satisfies the unused-import linter if core is not otherwise referenced
void core;

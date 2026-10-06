import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as core from "@keepkey/hdwallet-core";

import { type TransportDelegate, Transport, TransportTimeoutError } from "./transport";

function packet(type: number, msg: any) {
  const body = msg.serializeBinary(),
    out = new Uint8Array(64),
    view = new DataView(out.buffer);
  out.set([63, 35, 35]);
  view.setUint16(3, type);
  view.setUint32(5, body.length);
  out.set(body, 9);
  return out;
}
function setup(read: () => Promise<Uint8Array>) {
  let writes = 0,
    closes = 0;
  const delegate: TransportDelegate = {
    isOpened: async () => true,
    getDeviceID: async () => "fake",
    connect: async () => {},
    disconnect: async () => {
      closes++;
    },
    writeChunk: async () => {
      writes++;
    },
    readChunk: read,
  };
  return { transport: new Transport(new core.Keyring(), delegate), writes: () => writes, closes: () => closes };
}
describe("transport response deadlines", () => {
  it("quarantines a timed-out read, rejects queued work, and discards a late reply", async () => {
    let deliver: (value: Uint8Array) => void = () => {};
    const fake = setup(
      () =>
        new Promise((resolve) => {
          deliver = resolve;
        })
    );
    const first = fake.transport.call(Messages.MessageType.MESSAGETYPE_PING, new Messages.Ping(), { msgTimeout: 15 });
    const next = fake.transport.call(Messages.MessageType.MESSAGETYPE_PING, new Messages.Ping(), { msgTimeout: 15 });
    const outcomes = await Promise.allSettled([first, next]);
    expect(outcomes.map((o) => o.status)).toEqual(["rejected", "rejected"]);
    expect((outcomes[0] as PromiseRejectedResult).reason).toBeInstanceOf(TransportTimeoutError);
    expect(fake.writes()).toBe(1);
    expect(fake.closes()).toBe(1);
    deliver(packet(Messages.MessageType.MESSAGETYPE_SUCCESS, new Messages.Success()));
    await new Promise((resolve) => setTimeout(resolve, 5));
    await expect(fake.transport.call(Messages.MessageType.MESSAGETYPE_PING, new Messages.Ping())).rejects.toThrow(
      "Unplug and reconnect"
    );
    expect(await fake.transport.isOpened()).toBe(false);
    expect(fake.writes()).toBe(1);
  });
  it("does not apply the initial short response deadline to a user button prompt", async () => {
    let reads = 0;
    const fake = setup(async () => {
      if (++reads === 1) return packet(Messages.MessageType.MESSAGETYPE_BUTTONREQUEST, new Messages.ButtonRequest());
      await new Promise((resolve) => setTimeout(resolve, 45));
      return packet(Messages.MessageType.MESSAGETYPE_SUCCESS, new Messages.Success());
    });
    const result = await fake.transport.call(Messages.MessageType.MESSAGETYPE_PING, new Messages.Ping(), {
      msgTimeout: 15,
    });
    expect(result.message_enum).toBe(Messages.MessageType.MESSAGETYPE_SUCCESS);
    expect(fake.writes()).toBe(2);
    expect(fake.closes()).toBe(0);
  });
  it("clears successful timers so later calls remain usable", async () => {
    const fake = setup(async () => packet(Messages.MessageType.MESSAGETYPE_SUCCESS, new Messages.Success()));
    await fake.transport.call(Messages.MessageType.MESSAGETYPE_PING, new Messages.Ping(), { msgTimeout: 15 });
    await new Promise((resolve) => setTimeout(resolve, 25));
    await fake.transport.call(Messages.MessageType.MESSAGETYPE_PING, new Messages.Ping(), { msgTimeout: 15 });
    expect(fake.writes()).toBe(2);
    expect(fake.closes()).toBe(0);
  });
});

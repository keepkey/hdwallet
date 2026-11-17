import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as Types from "@keepkey/device-protocol/lib/types_pb";
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

// Advance days of idle time without sleeping or talking to a real wallet.
async function flushPromises() {
  for (let i = 0; i < 40; i++) await Promise.resolve();
}

function pinFixture() {
  const replies: Uint8Array[] = [];
  let pending: { resolve: (value: Uint8Array) => void; reject: (error: Error) => void } | undefined;
  const fake = setup(async () => {
    if (replies.length) return replies.shift()!;
    return new Promise<Uint8Array>((resolve, reject) => {
      pending = { resolve, reject };
    });
  });
  return {
    ...fake,
    reply(type: number, msg: any) {
      const response = packet(type, msg);
      if (pending) {
        const reader = pending;
        pending = undefined;
        reader.resolve(response);
      } else replies.push(response);
    },
    failRead(error: Error) {
      const reader = pending;
      pending = undefined;
      if (!reader) throw new Error("No pending reader");
      reader.reject(error);
    },
  };
}

describe("unattended PIN prompts", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const PIN_REQUEST = Messages.MessageType.MESSAGETYPE_PINMATRIXREQUEST;
  const SUCCESS = Messages.MessageType.MESSAGETYPE_SUCCESS;
  const submitPin = (transport: Transport) =>
    transport.call(Messages.MessageType.MESSAGETYPE_PINMATRIXACK, new Messages.PinMatrixAck(), {
      omitLock: true,
      noWait: true,
    });

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("accepts a PIN after 48 hours and keeps queued work behind the original reader", async () => {
    const fake = pinFixture();
    fake.reply(PIN_REQUEST, new Messages.PinMatrixRequest());
    const unlock = fake.transport.call(Messages.MessageType.MESSAGETYPE_PING, new Messages.Ping());
    const queued = fake.transport.call(Messages.MessageType.MESSAGETYPE_PING, new Messages.Ping());
    await flushPromises();
    jest.advanceTimersByTime(2 * DAY);
    await flushPromises();
    expect(fake.closes()).toBe(0);
    expect(fake.writes()).toBe(1);
    expect(fake.transport.userActionRequired).toBe(true);

    await submitPin(fake.transport);
    fake.reply(SUCCESS, new Messages.Success());
    expect((await unlock).message_enum).toBe(SUCCESS);
    await flushPromises();
    fake.reply(SUCCESS, new Messages.Success());
    await queued;
    jest.advanceTimersByTime(DAY);
    expect(fake.writes()).toBe(3); // unlock, PIN ACK, queued ping
    expect(fake.closes()).toBe(0);
    expect(fake.transport.userActionRequired).toBe(false);
  });

  it("gives each matrix in ChangePin its own indefinite user wait", async () => {
    const fake = pinFixture();
    const operation = fake.transport.call(Messages.MessageType.MESSAGETYPE_CHANGEPIN, new Messages.ChangePin());
    const types: number[] = [];
    fake.transport.on(String(PIN_REQUEST), (event: core.Event) => types.push(event.message.type));
    for (const type of [1, 2, 3] as const) {
      const matrix = new Messages.PinMatrixRequest();
      matrix.setType(type);
      fake.reply(PIN_REQUEST, matrix);
      await flushPromises();
      jest.advanceTimersByTime(DAY);
      await flushPromises();
      expect(fake.closes()).toBe(0);
      await submitPin(fake.transport);
    }
    fake.reply(SUCCESS, new Messages.Success());
    await operation;
    jest.advanceTimersByTime(DAY);
    expect(types).toEqual([1, 2, 3]);
    expect(fake.closes()).toBe(0);
  });

  it("still delivers a wrong-PIN failure and permits a fresh prompt", async () => {
    const fake = pinFixture();
    fake.reply(PIN_REQUEST, new Messages.PinMatrixRequest());
    const operation = fake.transport.call(Messages.MessageType.MESSAGETYPE_PING, new Messages.Ping());
    const outcome = operation.catch((error) => error);
    await flushPromises();
    jest.advanceTimersByTime(DAY);
    await submitPin(fake.transport);
    const failure = new Messages.Failure();
    failure.setCode(Types.FailureType.FAILURE_PININVALID);
    fake.reply(Messages.MessageType.MESSAGETYPE_FAILURE, failure);
    expect((await outcome).message.code).toBe(Types.FailureType.FAILURE_PININVALID);

    fake.reply(PIN_REQUEST, new Messages.PinMatrixRequest());
    const retry = fake.transport.call(Messages.MessageType.MESSAGETYPE_PING, new Messages.Ping());
    await flushPromises();
    jest.advanceTimersByTime(DAY);
    await flushPromises();
    expect(fake.closes()).toBe(0);
    await submitPin(fake.transport);
    fake.reply(SUCCESS, new Messages.Success());
    await retry;
  });

  it("bounds the response after submission, even from a synchronous PIN event listener", async () => {
    const fake = pinFixture();
    fake.transport.on(String(PIN_REQUEST), () => {
      void submitPin(fake.transport);
    });
    fake.reply(PIN_REQUEST, new Messages.PinMatrixRequest());
    const operation = fake.transport.call(Messages.MessageType.MESSAGETYPE_PING, new Messages.Ping());
    const outcome = operation.catch((error) => error);
    await flushPromises();
    jest.advanceTimersByTime(core.LONG_TIMEOUT);
    await flushPromises();
    expect(await outcome).toBeInstanceOf(TransportTimeoutError);
    expect(fake.closes()).toBe(1);
    expect(await fake.transport.isOpened()).toBe(false);
  });

  it("can cancel after a day and reuse the transport after the device's cancellation response", async () => {
    const fake = pinFixture();
    fake.reply(PIN_REQUEST, new Messages.PinMatrixRequest());
    const operation = fake.transport.call(Messages.MessageType.MESSAGETYPE_PING, new Messages.Ping());
    const outcome = operation.catch((error) => error);
    await flushPromises();
    jest.advanceTimersByTime(DAY);
    await fake.transport.cancel();
    const cancelled = new Messages.Failure();
    cancelled.setCode(Types.FailureType.FAILURE_PINCANCELLED);
    fake.reply(Messages.MessageType.MESSAGETYPE_FAILURE, cancelled);
    expect((await outcome).message.code).toBe(Types.FailureType.FAILURE_PINCANCELLED);
    jest.advanceTimersByTime(DAY);
    fake.reply(SUCCESS, new Messages.Success());
    await fake.transport.call(Messages.MessageType.MESSAGETYPE_PING, new Messages.Ping());
    expect(fake.closes()).toBe(0);
  });

  it("times out if the device ignores cancellation of an idle PIN prompt", async () => {
    const fake = pinFixture();
    fake.reply(PIN_REQUEST, new Messages.PinMatrixRequest());
    const operation = fake.transport.call(Messages.MessageType.MESSAGETYPE_PING, new Messages.Ping());
    const outcome = operation.catch((error) => error);
    await flushPromises();
    jest.advanceTimersByTime(DAY);
    await fake.transport.cancel();
    jest.advanceTimersByTime(core.LONG_TIMEOUT);
    await flushPromises();
    expect(await outcome).toBeInstanceOf(TransportTimeoutError);
    expect(fake.closes()).toBe(1);
  });

  it("propagates a disconnect while idle and leaves no deadline behind", async () => {
    const fake = pinFixture();
    fake.reply(PIN_REQUEST, new Messages.PinMatrixRequest());
    const operation = fake.transport.call(Messages.MessageType.MESSAGETYPE_PING, new Messages.Ping());
    const outcome = operation.catch((error) => error);
    await flushPromises();
    jest.advanceTimersByTime(DAY);
    fake.failRead(new Error("Device disconnected"));
    expect(await outcome).toEqual(new Error("Device disconnected"));
    await submitPin(fake.transport); // a late UI event must not arm the old deadline
    jest.advanceTimersByTime(DAY);
    expect(fake.closes()).toBe(0);
  });

  it("keeps PIN writes bounded while the user wait is suspended", async () => {
    const fake = pinFixture();
    fake.reply(PIN_REQUEST, new Messages.PinMatrixRequest());
    const operation = fake.transport.call(Messages.MessageType.MESSAGETYPE_PING, new Messages.Ping());
    const outcome = operation.catch((error) => error);
    await flushPromises();
    fake.transport.delegate.writeChunk = () => new Promise(() => {});
    const submission = submitPin(fake.transport).catch((error) => error);
    await flushPromises();
    jest.advanceTimersByTime(core.DEFAULT_TIMEOUT);
    await flushPromises();
    expect(await submission).toBeInstanceOf(TransportTimeoutError);
    expect(fake.closes()).toBe(1);
    fake.failRead(new Error("Connection closed"));
    await outcome;
  });
});

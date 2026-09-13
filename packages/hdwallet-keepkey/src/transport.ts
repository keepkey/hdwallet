import * as Messages from "@keepkey/device-protocol/lib/messages_pb";
import * as Types from "@keepkey/device-protocol/lib/types_pb";
import * as core from "@keepkey/hdwallet-core";
import * as crypto from "crypto";
import * as jspb from "google-protobuf";

import { messageNameRegistry, messageTypeRegistry } from "./typeRegistry";
import { SEGMENT_SIZE } from "./utils";

export interface TransportDelegate {
  isOpened(): Promise<boolean>;
  getDeviceID(): Promise<string>;

  connect(): Promise<void>;
  tryConnectDebugLink?(): Promise<boolean>;
  disconnect(): Promise<void>;

  writeChunk(buf: Uint8Array, debugLink?: boolean): Promise<void>;
  readChunk(debugLink?: boolean): Promise<Uint8Array>;
}

export class TransportTimeoutError extends Error {
  constructor(operation: string, timeoutMs: number) {
    super(`KeepKey device timed out during ${operation} after ${timeoutMs}ms. Unplug and reconnect your KeepKey before trying again.`);
    this.name = "TransportTimeoutError";
  }
}

export class Transport extends core.Transport {
  debugLink = false;
  userActionRequired = false;
  delegate: TransportDelegate;
  // A timed-out read may still be alive inside a USB/HID delegate. Never reuse
  // this transport: a fresh connection must own all subsequent device traffic.
  private timeoutError?: TransportTimeoutError;

  /// One per transport, unlike on Trezor, since the contention is
  /// only per-device, not global.
  callInProgress: {
    main?: Promise<any>;
    debug?: Promise<any>;
  } = {
    main: undefined,
    debug: undefined,
  };

  constructor(keyring: core.Keyring, delegate: TransportDelegate) {
    super(keyring);
    this.delegate = delegate;
  }

  public static async create(keyring: core.Keyring, delegate: TransportDelegate): Promise<Transport> {
    return new Transport(keyring, delegate);
  }

  public isOpened(): Promise<boolean> {
    if (this.timeoutError) return Promise.resolve(false);
    return this.delegate.isOpened();
  }
  public getDeviceID(): Promise<string> {
    return this.delegate.getDeviceID();
  }

  public connect(): Promise<void> {
    this.assertUsable();
    return this.delegate.connect();
  }
  public async tryConnectDebugLink(): Promise<boolean> {
    let out = false;
    if (this.delegate.tryConnectDebugLink && (await this.delegate.tryConnectDebugLink())) out = true;
    this.debugLink = out;
    return out;
  }
  public disconnect(): Promise<void> {
    return this.delegate.disconnect();
  }

  private assertUsable(): void {
    if (this.timeoutError) throw this.timeoutError;
  }

  private async withDeadline<T>(action: () => Promise<T>, timeoutMs: number, operation: string): Promise<T> {
    this.assertUsable();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        action(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            const error = new TransportTimeoutError(operation, timeoutMs);
            this.timeoutError = error;
            this.userActionRequired = false;
            reject(error);
            // Quarantine first. Closing normally cancels the delegate's read,
            // but the timeout must still settle if close itself gets stuck.
            void Promise.resolve().then(() => this.delegate.disconnect()).catch(() => undefined);
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  private async write(buf: Uint8Array, debugLink: boolean): Promise<void> {
    // break frame into segments
    for (let i = 0; i < buf.length; i += SEGMENT_SIZE) {
      const segment = buf.slice(i, i + SEGMENT_SIZE);
      const padding = new Uint8Array(SEGMENT_SIZE - segment.length);
      const fragments: Array<Uint8Array> = [];
      fragments.push(new Uint8Array([SEGMENT_SIZE]));
      fragments.push(segment);
      fragments.push(padding);
      const fragmentBuffer = new Uint8Array(fragments.map((x) => x.length).reduce((a, x) => a + x, 0));
      fragments.reduce((a, x) => (fragmentBuffer.set(x, a), a + x.length), 0);
      this.assertUsable();
      await this.delegate.writeChunk(fragmentBuffer, debugLink);
      this.assertUsable();
    }
  }

  private async read(debugLink: boolean): Promise<Uint8Array> {
    this.assertUsable();
    const first = await this.delegate.readChunk(debugLink);
    this.assertUsable();

    // Check that buffer starts with: "?##" [ 0x3f, 0x23, 0x23 ]
    // "?" = USB reportId, "##" = KeepKey magic bytes
    // Message ID is bytes 4-5. Message length starts at byte 6.
    const firstView = new DataView(first.buffer.slice(first.byteOffset, first.byteOffset + first.byteLength));
    const valid = (firstView.getUint32(0) & 0xffffff00) === 0x3f232300;
    const msgLength = firstView.getUint32(5);
    if (!valid) throw new Error("message not valid");

    const buffer = new Uint8Array(9 + msgLength);
    buffer.set(first.slice(0, Math.min(first.length, buffer.length)));

    for (let offset = first.length; offset < buffer.length; ) {
      // Drop USB "?" reportId in the first byte
      const next = (await this.delegate.readChunk(debugLink)).slice(1);
      this.assertUsable();
      buffer.set(next.slice(0, Math.min(next.length, buffer.length - offset)), offset);
      offset += next.length;
    }

    return buffer;
  }

  public getVendor(): string {
    return "KeepKey";
  }

  public getEntropy(length: number): Uint8Array {
    if (typeof window !== "undefined" && window?.crypto) {
      return window.crypto.getRandomValues(new Uint8Array(length));
    }
    return crypto.randomBytes(length);
  }

  public async getFirmwareHash(firmware: Uint8Array): Promise<Uint8Array> {
    if (typeof window !== "undefined" && window?.crypto) {
      const buf = firmware.buffer.slice(firmware.byteOffset, firmware.byteOffset + firmware.byteLength) as ArrayBuffer;
      return new Uint8Array(await window.crypto.subtle.digest({ name: "SHA-256" }, buf));
    }
    const hash = crypto.createHash("sha256");
    hash.update(firmware);
    return hash.digest();
  }

  /**
   * Utility function to cancel all pending calls whenver one of them is cancelled.
   */
  public async cancellable(inProgress?: Promise<any>): Promise<void> {
    try {
      await inProgress;
    } catch (e) {
      // Throw away the error, as the other context will handle it,
      // unless it was a cancel, in which case we cancel everything.
      if (core.isIndexable(e) && e.type === core.HDWalletErrorType.ActionCancelled) {
        this.callInProgress = { main: undefined, debug: undefined };
        throw e;
      }
    }
  }

  public async lockDuring<T>(action: () => Promise<T>): Promise<T> {
    this.callInProgress.main = (async () => {
      await this.cancellable(this.callInProgress.main);
      this.assertUsable();
      return action();
    })();
    return this.callInProgress.main;
  }

  public async handleCancellableResponse() {
    return this.readResponse(false);
  }

  public async readResponse(debugLink: boolean, timeoutMs = core.LONG_TIMEOUT): Promise<core.Event> {
    let buf;
    do {
      buf = await this.withDeadline(() => this.read(debugLink), timeoutMs, "device response");
    } while (!buf);
    const [msgTypeEnum, msg] = this.fromMessageBuffer(buf);
    const event = core.makeEvent({
      message_type: messageNameRegistry[msgTypeEnum],
      message_enum: msgTypeEnum,
      message: msg.toObject(),
      proto: msg,
      from_wallet: true,
    });
    this.emit(String(msgTypeEnum), event);

    if (debugLink) return event;

    if (msgTypeEnum === Messages.MessageType.MESSAGETYPE_FAILURE) {
      const failureEvent = core.makeEvent({
        message_type: core.Events.FAILURE,
        message_enum: msgTypeEnum,
        message: msg.toObject(),
        from_wallet: true,
      });
      this.emit(core.Events.FAILURE, failureEvent);
      return failureEvent;
    }

    if (msgTypeEnum === Messages.MessageType.MESSAGETYPE_BUTTONREQUEST) {
      this.emit(
        core.Events.BUTTON_REQUEST,
        core.makeEvent({
          message_type: core.Events.BUTTON_REQUEST,
          from_wallet: true,
        })
      );
      this.userActionRequired = true;
      return this.call(Messages.MessageType.MESSAGETYPE_BUTTONACK, new Messages.ButtonAck(), {
        msgTimeout: core.LONG_TIMEOUT,
        omitLock: true,
      });
    }

    if (msgTypeEnum === Messages.MessageType.MESSAGETYPE_ENTROPYREQUEST) {
      const ack = new Messages.EntropyAck();
      ack.setEntropy(this.getEntropy(32));
      return this.call(Messages.MessageType.MESSAGETYPE_ENTROPYACK, ack, {
        msgTimeout: core.LONG_TIMEOUT,
        omitLock: true,
      });
    }

    if (msgTypeEnum === Messages.MessageType.MESSAGETYPE_PINMATRIXREQUEST) {
      this.emit(
        core.Events.PIN_REQUEST,
        core.makeEvent({
          message_type: core.Events.PIN_REQUEST,
          from_wallet: true,
        })
      );
      this.userActionRequired = true;
      return this.handleCancellableResponse();
    }

    if (msgTypeEnum === Messages.MessageType.MESSAGETYPE_PASSPHRASEREQUEST) {
      this.emit(
        core.Events.PASSPHRASE_REQUEST,
        core.makeEvent({
          message_type: core.Events.PASSPHRASE_REQUEST,
          from_wallet: true,
        })
      );
      this.userActionRequired = true;
      return this.handleCancellableResponse();
    }

    if (msgTypeEnum === Messages.MessageType.MESSAGETYPE_CHARACTERREQUEST) {
      this.emit(
        core.Events.CHARACTER_REQUEST,
        core.makeEvent({
          message_type: core.Events.CHARACTER_REQUEST,
          from_wallet: true,
        })
      );
      this.userActionRequired = true;
      return this.handleCancellableResponse();
    }

    if (msgTypeEnum === Messages.MessageType.MESSAGETYPE_WORDREQUEST) {
      this.emit(
        core.Events.WORD_REQUEST,
        core.makeEvent({
          message_type: core.Events.WORD_REQUEST,
          from_wallet: true,
        })
      );
      this.userActionRequired = true;
      return this.handleCancellableResponse();
    }

    return event;
  }

  public async call(
    msgTypeEnum: number,
    msg: jspb.Message,
    options?: {
      msgTimeout?: number;
      omitLock?: boolean;
      noWait?: false;
      debugLink?: boolean;
    }
  ): Promise<core.Event>;
  public async call(
    msgTypeEnum: number,
    msg: jspb.Message,
    options: {
      msgTimeout?: number;
      omitLock?: boolean;
      noWait: true;
      debugLink?: boolean;
    }
  ): Promise<undefined>;
  public async call(
    msgTypeEnum: number,
    msg: jspb.Message,
    options?: {
      msgTimeout?: number;
      omitLock?: boolean;
      noWait?: boolean;
      debugLink?: boolean;
    }
  ): Promise<core.Event | undefined> {
    options ??= {};
    options.msgTimeout ??= core.DEFAULT_TIMEOUT;
    this.assertUsable();
    if (!Number.isFinite(options.msgTimeout) || options.msgTimeout <= 0) {
      throw new Error("KeepKey msgTimeout must be a positive number of milliseconds");
    }

    this.emit(
      String(msgTypeEnum),
      core.makeEvent({
        message_type: messageNameRegistry[msgTypeEnum],
        message_enum: msgTypeEnum,
        message: msg.toObject(),
        proto: msg,
        from_wallet: false,
      })
    );

    const makePromise = async () => {
      this.assertUsable();
      if (
        (
          [
            Messages.MessageType.MESSAGETYPE_BUTTONACK,
            Messages.MessageType.MESSAGETYPE_PASSPHRASEACK,
            Messages.MessageType.MESSAGETYPE_CHARACTERACK,
            Messages.MessageType.MESSAGETYPE_PINMATRIXACK,
            Messages.MessageType.MESSAGETYPE_WORDACK,
          ] as Array<number>
        ).includes(msgTypeEnum)
      ) {
        this.userActionRequired = true;
      }
      await this.withDeadline(
        () => this.write(this.toMessageBuffer(msgTypeEnum, msg), !!options?.debugLink),
        options.msgTimeout!,
        `writing ${messageNameRegistry[msgTypeEnum] || msgTypeEnum}`
      );
      if (msgTypeEnum === 115 || msgTypeEnum === Messages.MessageType.MESSAGETYPE_ETHEREUMSIGNTX) {
        console.info(`[hdwallet] device write complete: ${messageNameRegistry[msgTypeEnum] || msgTypeEnum}`);
      }

      if (options?.noWait) return undefined;

      // Bound a wire response, not the entire interaction. Button/PIN prompts
      // switch to LONG_TIMEOUT in readResponse after the first reply arrives.
      const response = await this.readResponse(!!options?.debugLink, options.msgTimeout);
      this.userActionRequired = false;
      if (
        response.message_enum === Messages.MessageType.MESSAGETYPE_FAILURE &&
        response.message.code === Types.FailureType.FAILURE_ACTIONCANCELLED
      ) {
        this.callInProgress = { main: undefined, debug: undefined };
        throw new core.ActionCancelled();
      }
      if (response.message_type === core.Events.FAILURE) throw response;
      return response;
    };

    if (options?.omitLock) return makePromise();

    // See the comments in hdwallet-trezor-connect's call for why this weird
    // sequence. We've got a very similar issue here that needs pretty much
    // the same solution.
    const lockKey = options?.debugLink ? "debug" : "main";
    this.callInProgress[lockKey] = (async () => {
      await this.cancellable(this.callInProgress[lockKey]);

      try {
        return makePromise();
      } finally {
        this.userActionRequired = false;
      }
    })();

    return await this.callInProgress[lockKey];
  }

  public async cancel() {
    if (!this.userActionRequired) return;
    try {
      this.callInProgress = { main: undefined, debug: undefined };
      const cancelMsg = new Messages.Cancel();
      await this.call(Messages.MessageType.MESSAGETYPE_CANCEL, cancelMsg, {
        omitLock: this.userActionRequired,
        noWait: this.userActionRequired,
      });
    } catch (e) {
      console.error("Cancel Pending Error", e);
    } finally {
      this.callInProgress = { main: undefined, debug: undefined };
    }
  }

  protected toMessageBuffer(msgTypeEnum: number, msg: jspb.Message): Uint8Array {
    const messageBuffer = msg.serializeBinary();

    const headerBuffer = new Uint8Array(8);
    const headerView = new DataView(headerBuffer.buffer);

    headerView.setUint8(0, 0x23);
    headerView.setUint8(1, 0x23);
    headerView.setUint16(2, msgTypeEnum);
    headerView.setUint32(4, messageBuffer.byteLength);

    const fragments = [headerBuffer, messageBuffer];
    const fragmentBuffer = new Uint8Array(fragments.map((x) => x.length).reduce((a, x) => a + x, 0));
    fragments.reduce((a, x) => (fragmentBuffer.set(x, a), a + x.length), 0);
    return fragmentBuffer;
  }

  protected fromMessageBuffer(buf: Uint8Array): [number, jspb.Message] {
    const typeID = new DataView(buf.buffer).getUint16(3);
    const MType = messageTypeRegistry[typeID] as any;
    if (!MType) {
      const msg = new Messages.Failure();
      msg.setCode(Types.FailureType.FAILURE_UNEXPECTEDMESSAGE);
      msg.setMessage("Unknown message type received");
      return [Messages.MessageType.MESSAGETYPE_FAILURE, msg];
    }
    const msg = new MType();
    const reader = new jspb.BinaryReader(buf, 9, buf.length - 9);
    return [typeID, MType.deserializeBinaryFromReader(msg, reader)];
  }

  protected static failureMessageFactory(e?: Error | string): Uint8Array {
    const msg = new Messages.Failure();
    msg.setCode(Types.FailureType.FAILURE_UNEXPECTEDMESSAGE);
    if (typeof e === "string") {
      msg.setMessage(e);
    } else {
      msg.setMessage(String(e));
    }
    return msg.serializeBinary();
  }
}

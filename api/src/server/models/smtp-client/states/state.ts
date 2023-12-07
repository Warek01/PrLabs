import net from 'net'

import { SmtpClient, SmtpCommand, SmtpMessage } from '../smtp-client'

export enum State {
  START= 'start',
  INITIALIZED = 'helo',
  SENDER_RECIPIENT_READY = 'email',
  RECEIVING_DATA = 'data',
  QUIT = 'quit',
}

export abstract class SmtpClientState {
  protected static readonly State = State

  public abstract stateName: State

  protected abstract readonly _acceptsCommands: SmtpCommand[]
  protected readonly _client: SmtpClient
  protected readonly _socket: net.Socket

  public constructor(client: SmtpClient, socket: net.Socket) {
    this._client = client
    this._socket = socket
  }

  // Returns new state that client will have
  public abstract handleMessage(message: SmtpMessage): SmtpClientState

  public ensureAccept(command: SmtpCommand): boolean {
    return this._acceptsCommands.includes(command)
  }
}

import net from 'net'

import { SmtpClient } from '../SmtpClient'
import { SmtpMessage, SmtpStateName } from '../SmtpClient.types'
import { SmtpCommand } from '../../../../types'

export abstract class SmtpState {
  public abstract stateName: SmtpStateName

  protected abstract readonly _acceptsCommands: SmtpCommand[]
  protected readonly _client: SmtpClient
  protected readonly _socket: net.Socket

  public constructor(client: SmtpClient, socket: net.Socket) {
    this._client = client
    this._socket = socket
  }

  public abstract handleMessage(message: SmtpMessage): SmtpState

  public ensureAccept(command: SmtpCommand): boolean {
    return this._acceptsCommands.includes(command)
  }
}

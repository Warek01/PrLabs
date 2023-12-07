import { SmtpClientState } from './state'
import { SmtpClient, SmtpCommand, SmtpMessage } from '../smtp-client'
import { SmtpClientInitializedState } from './initialized-state'

// Instance created, but no HELO/EHLO or emails specified
export class SmtpClientStartState extends SmtpClientState {
  public stateName = SmtpClientState.State.START

  protected readonly _acceptsCommands: SmtpCommand[] = [
    SmtpCommand.HELO,
    SmtpCommand.EHLO,
  ]

  public override handleMessage(message: SmtpMessage): SmtpClientState {
    this._client.send(SmtpClient.Response.READY)
    return new SmtpClientInitializedState(this._client, this._socket)
  }
}

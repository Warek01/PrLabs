import { SmtpClientState } from './state'
import { SmtpClient, SmtpCommand, SmtpMessage } from '../smtp-client'

// Instance quit
export class SmtpClientQuitState extends SmtpClientState {
  public stateName = SmtpClientState.State.QUIT

  protected readonly _acceptsCommands: SmtpCommand[] = []

  public override handleMessage(message: SmtpMessage): SmtpClientState {
    this._client.send(SmtpClient.Response.BYE)
    this._client.close()
    return this
  }
}

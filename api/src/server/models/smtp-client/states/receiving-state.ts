import { SmtpClientState } from './state'
import { SmtpClient, SmtpCommand, SmtpMessage } from '../smtp-client'
import { SmtpClientQuitState } from './quit-state'

// Receiving messages
export class SmtpClientReceivingState extends SmtpClientState {
  public stateName = SmtpClientState.State.RECEIVING_DATA

  protected readonly _acceptsCommands: SmtpCommand[] = [
    SmtpCommand.DATA,
    SmtpCommand.QUIT,
  ]

  public override handleMessage(message: SmtpMessage): SmtpClientState {
    // TODO: implement receiving if is in state DATA
    // must refactor command validation to accept empty command
    this._client.sendEmailTo(message.payload)
    this._client.send(SmtpClient.Response.OK)

    return message.command === SmtpCommand.QUIT
      ? new SmtpClientQuitState(this._client, this._socket)
      : this
  }
}

import { SmtpClientState } from './state'
import { SmtpClient, SmtpCommand, SmtpMessage } from '../smtp-client'
import { SmtpClientSenderRecipientReadyState } from './sender-recipient-ready-state'

// HELO/EHLO received
export class SmtpClientInitializedState extends SmtpClientState {
  public stateName = SmtpClientState.State.INITIALIZED

  protected readonly _acceptsCommands: SmtpCommand[] = [
    SmtpCommand.RCPT_TO,
    SmtpCommand.MAIL_FROM,
  ]

  public override handleMessage(message: SmtpMessage): SmtpClientState {
    this._client.identifier = message.payload

    this._client.send(SmtpClient.Response.OK + ': ' + message.payload)

    return new SmtpClientSenderRecipientReadyState(this._client, this._socket)
  }
}

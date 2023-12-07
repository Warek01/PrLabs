import { SmtpClientState } from './state'
import { SmtpClient, SmtpCommand, SmtpMessage } from '../smtp-client'
import { SmtpClientReceivingState } from './receiving-state'

// Identifier received, waiting for recipient/sender/data
export class SmtpClientSenderRecipientReadyState extends SmtpClientState {
  public stateName = SmtpClientState.State.SENDER_RECIPIENT_READY

  protected readonly _acceptsCommands: SmtpCommand[] = [
    SmtpCommand.RCPT_TO,
    SmtpCommand.MAIL_FROM,
    SmtpCommand.DATA,
  ]

  public override handleMessage(message: SmtpMessage): SmtpClientState {
    // If both emails are not set, but data is received
    if (
      !this._client.senderEmail &&
      !this._client.recipientEmail &&
      message.command === SmtpCommand.DATA
    ) {
      this._client.sendBadSeq()
      return
    }

    switch (message.command) {
      case SmtpCommand.MAIL_FROM:
        this._client.senderEmail = message.payload
        this._client.send(SmtpClient.Response.OK + ' ' + message.payload)
        return this
      case SmtpCommand.RCPT_TO:
        this._client.recipientEmail = message.payload
        this._client.send(SmtpClient.Response.OK + ' ' + message.payload)
        return this
      case SmtpCommand.DATA:
        this._client.send(SmtpClient.Response.START_MAIL)
        return new SmtpClientReceivingState(this._client, this._socket)
    }
  }
}

import { SmtpState } from './SmtpState'
import { SmtpDataState } from './SmtpDataState'
import {
  SmtpMessage,
  SmtpResponse,
  SmtpStateName,
} from '../SmtpClient.types'
import { SmtpCommand } from '../../../../types'

// Identifier received, waiting for recipient/sender/data
export class SmtpEmailState extends SmtpState {
  public stateName = SmtpStateName.SENDER_RECIPIENT_READY

  protected readonly _acceptsCommands: SmtpCommand[] = [
    SmtpCommand.RCPT_TO,
    SmtpCommand.MAIL_FROM,
    SmtpCommand.DATA,
  ]

  public override handleMessage(message: SmtpMessage): SmtpState {
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
        this._client.send(SmtpResponse.OK + ' ' + message.payload)
        return this
      case SmtpCommand.RCPT_TO:
        this._client.recipientEmail = message.payload
        this._client.send(SmtpResponse.OK + ' ' + message.payload)
        return this
      case SmtpCommand.DATA:
        this._client.send(SmtpResponse.START_MAIL)
        return new SmtpDataState(this._client, this._socket)
    }
  }
}

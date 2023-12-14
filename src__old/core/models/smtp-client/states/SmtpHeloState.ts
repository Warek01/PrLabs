import { SmtpState } from './SmtpState'
import { SmtpEmailState } from './SmtpEmailState'
import {
  SmtpMessage,
  SmtpResponse,
  SmtpStateName,
} from '../SmtpClient.types'
import { SmtpCommand } from '../../../../types'

// HELO/EHLO received
export class SmtpHeloState extends SmtpState {
  public stateName = SmtpStateName.INITIALIZED

  protected readonly _acceptsCommands: SmtpCommand[] = [
    SmtpCommand.RCPT_TO,
    SmtpCommand.MAIL_FROM,
  ]

  public override handleMessage(message: SmtpMessage): SmtpState {
    this._client.identifier = message.payload

    this._client.send(SmtpResponse.OK + ': ' + message.payload)

    return new SmtpEmailState(this._client, this._socket)
  }
}

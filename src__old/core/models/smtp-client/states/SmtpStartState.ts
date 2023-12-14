import { SmtpState } from './SmtpState'
import { SmtpHeloState } from './SmtpHeloState'
import {
  SmtpMessage,
  SmtpResponse,
  SmtpStateName,
} from '../SmtpClient.types'
import { SmtpCommand } from '../../../../types'

// Instance created, but no HELO/EHLO or emails specified
export class SmtpStartState extends SmtpState {
  public stateName = SmtpStateName.START

  protected readonly _acceptsCommands: SmtpCommand[] = [
    SmtpCommand.HELO,
    SmtpCommand.EHLO,
  ]

  public override handleMessage(message: SmtpMessage): SmtpState {
    this._client.send(SmtpResponse.READY)
    return new SmtpHeloState(this._client, this._socket)
  }
}

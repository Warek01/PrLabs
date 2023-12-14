import { SmtpState } from './SmtpState'
import {
  SmtpMessage,
  SmtpStateName,
} from '../SmtpClient.types'
import { SmtpCommand } from '../../../../types'

// Instance quit
export class SmtpQuitState extends SmtpState {
  public stateName = SmtpStateName.QUIT

  protected readonly _acceptsCommands: SmtpCommand[] = [SmtpCommand.QUIT]

  public override handleMessage(message: SmtpMessage): SmtpState {
    return this
  }
}

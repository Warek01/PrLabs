import { SmtpState } from './SmtpState'
import { SmtpQuitState } from './SmtpQuitState'
import {
  SmtpMessage,
  SmtpResponse,
  SmtpStateName,
} from '../SmtpClient.types'
import { SmtpCommand } from '../../../../types'

// Receiving messages
export class SmtpDataState extends SmtpState {
  public stateName = SmtpStateName.DATA

  protected readonly _acceptsCommands: SmtpCommand[] = [
    SmtpCommand.DATA,
    SmtpCommand.QUIT,
  ]

  public override handleMessage(message: SmtpMessage): SmtpState {
    this._client.addBodyContent(message.payload)
    this._client.send(SmtpResponse.OK)

    if (message.command === SmtpCommand.QUIT) {
      this._client.send(SmtpResponse.BYE)
      this._client.close()
      return new SmtpQuitState(this._client, this._socket)
    }

    return this
  }
}

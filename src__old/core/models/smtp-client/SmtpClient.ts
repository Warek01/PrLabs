import net from 'net'

import { Logger } from '../Logger'
import { SmtpStartState } from './states/SmtpStartState'
import {
  SmtpMessage,
  SmtpResponse,
  SmtpStateName,
} from './SmtpClient.types'
import { SmtpState } from './states/SmtpState'
import { SmtpCommand } from '../../../types'

export class SmtpClient {
  public senderEmail: string | null = null
  public recipientEmail: string | null = null
  public identifier: string | null = null
  public emailBody: string = ''

  private socket: net.Socket
  private readonly _allClients: SmtpClient[]
  private _state: SmtpState
  private _logger: Logger

  constructor(socket: net.Socket, allClients: SmtpClient[]) {
    this.socket = socket
    this._allClients = allClients
    this._logger = new Logger(SmtpClient.name)
    this._state = new SmtpStartState(this, socket)

    socket.on('data', this.handleData.bind(this))
  }

  private static countChars(str: string, char: string): number {
    let i = 0

    for (const c of str) if (char === c) i++

    return i
  }

  public handleData(buffer: Buffer): void {
    if (this._state.stateName === SmtpStateName.QUIT) {
      return
    }

    const data = buffer.toString('utf-8')

    if (SmtpClient.countChars(data, '\n') <= 1) {
      this.handleSinglelineMode(data)
    } else {
      this.handleMultilineMode(data)
    }
  }

  public send(str: string) {
    str += '\r\n'
    this.socket.write(Buffer.from(str, 'utf-8'))
  }

  public sendEmailTo(identifier: string): boolean {
    const client = this._allClients.find((c) => c.identifier === identifier)
    // TODO: implement sending to recipient client
    this._logger.log(`Sending to ${client.identifier}
    ${this.emailBody}`)

    this.emailBody = ''
    return true
  }

  public sendBadSeq(): void {
    this.send(SmtpResponse.BAD_SEQ)
  }

  public close(): void {
    this.socket.end()
  }

  public addBodyContent(text: string): void {
    this.emailBody += text + '\r\n'
  }

  private _getMessage(data: string): SmtpMessage | null {
    let command: SmtpCommand | null = null

    Object.values(SmtpCommand).forEach((c) => {
      if (data.startsWith(c)) {
        command = c
      }
    })

    return {
      command,
      payload: command ? data.split(command)[1].trim() : data.trim(),
    }
  }

  private _setState(newState: SmtpState): void {
    this._logger.log(`[${this._state.stateName}] -> [${newState.stateName}]`)
    this._state = newState
  }

  private handleMultilineMode(data: string) {
    data
      .split('\n')
      .map((l) => l.trim())
      .forEach((l) => {
        if (this._state.stateName === SmtpStateName.DATA && l === '') {
          this.sendEmailTo(this.identifier)
        } else if (l === '') {
          return
        } else {
          this.handleSinglelineMode(l)
        }
      })
  }

  private handleSinglelineMode(data: string) {
    const message = this._getMessage(data)

    this._logger.log(
      `[${this._state.stateName}] "${message?.command ?? 'none'}": "${
        message?.payload?.slice(0, 20) ?? 'none'
      }"`,
    )

    if (
      message.command &&
      !Object.values(SmtpCommand).includes(message.command)
    ) {
      this.send(SmtpResponse.INVALID_COMMAND)
      return
    }

    if (
      this._state.stateName === SmtpStateName.DATA &&
      message?.command === null
    ) {
      this._state = this._state.handleMessage({ command: null, payload: data })
      return
    }

    if (!this._state.ensureAccept(message.command)) {
      this.sendBadSeq()
      return
    }

    this._setState(this._state.handleMessage(message))
  }
}

import net from 'net'

import { SmtpClientState, State } from './states/state'
import { Logger } from '../logger'
import { SmtpClientStartState } from './states/start-state'

enum Response {
  READY = '220 Service ready',
  BYE = '221 Bye',
  OK = '250 Ok',
  START_MAIL = '354 End mail with <CR><LF><CR><LF>',
  INVALID_COMMAND = '500 Syntax error, command unrecognized',
  BAD_SEQ = '503 Bad sequence of commands',
}

export enum SmtpCommand {
  HELO = 'HELO',
  EHLO = 'EHLO',
  DATA = 'DATA',
  QUIT = 'QUIT',
  MAIL_FROM = 'MAIL FROM:',
  RCPT_TO = 'RCPT TO:',
}

export interface SmtpMessage {
  command: SmtpCommand | null
  payload: string
}

export class SmtpClient {
  public static readonly Response = Response
  public static readonly AllowedCommands: SmtpCommand[] =
    Object.values(SmtpCommand)

  public senderEmail: string | null = null
  public recipientEmail: string | null = null
  public identifier: string | null = null

  private socket: net.Socket
  private readonly _allClients: SmtpClient[]
  private _state: SmtpClientState
  private _logger: Logger
  private readonly _debug: boolean

  constructor(
    socket: net.Socket,
    allClients: SmtpClient[],
    debug: boolean = true,
  ) {
    this.socket = socket
    this._allClients = allClients
    this._logger = new Logger(SmtpClient.name)
    this._debug = debug
    this._state = new SmtpClientStartState(this, socket)

    socket.on('data', this.handleData.bind(this))
  }

  public handleData(buffer: Buffer): void {
    const data = buffer.toString('utf-8')
    const message = this._getMessage(data)

    this._logger.log(
      `[${this._state.stateName}] "${
        message?.command ?? 'none'
      }": "${message?.payload?.slice(0, 20) ?? 'none'}"`,
    )

    if (!message.command && this._state.stateName !== State.RECEIVING_DATA) {
      this.send(Response.INVALID_COMMAND)
      return
    }

    if (
      this._state.stateName === State.RECEIVING_DATA &&
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

  public send(str: string) {
    if (this._debug) {
      str += '\r\n'
    }

    this.socket.write(Buffer.from(str, 'utf-8'))
  }

  public sendEmailTo(identifier: string): boolean {
    const client = this._allClients.find((c) => c.identifier === identifier)
    // TODO: implement sending to recipient client
    return true
  }

  public sendBadSeq(): void {
    this.send(SmtpClient.Response.BAD_SEQ)
  }

  public close(): void {
    this.socket.end()
  }

  private _getMessage(data: string): SmtpMessage | null {
    let command: SmtpCommand | null = null

    SmtpClient.AllowedCommands.forEach((c) => {
      if (data.startsWith(c)) {
        command = c
      }
    })

    return {
      command,
      payload: command ? data.split(command)[1].trim() : data.trim(),
    }
  }

  private _setState(newState: SmtpClientState): void {
    this._logger.log(
      `[${this._state.stateName}] -> [${
        newState.stateName
      }]`,
    )
    this._state = newState
  }
}

import { SmtpCommand } from '../../../types'

export enum SmtpResponse {
  READY = '220 Service ready',
  BYE = '221 Bye',
  OK = '250 Ok',
  START_MAIL = '354 End mail with <CR><LF><CR><LF>',
  INVALID_COMMAND = '500 Syntax error, command unrecognized',
  BAD_SEQ = '503 Bad sequence of commands',
}

export interface SmtpMessage {
  command: SmtpCommand | null
  payload: string
}

export enum SmtpStateName {
  START= 'start',
  INITIALIZED = 'helo',
  SENDER_RECIPIENT_READY = 'email',
  DATA = 'data',
  QUIT = 'quit',
}

export const APP_PORT = 3000
export const APP_HOST = '127.0.0.1'
export const MAX_FILE_PAYLOAD_SIZE = 1024

export enum MessageType {
  ConnectionAck = 'connection_ack',
  Notification = 'notification',
  Message = 'message',
  Connect = 'connect',
  Shutdown = 'shutdown',
  Download = 'download',
  Upload = 'upload',
  TransmitChunk = 'transmit_chunk',
  TransmitChunkAck = 'transmit_chunk_ack',
  StartTransmit = 'transmit_start',
  StartTransmitAck = 'transmit_start_ack',
  EndTransmit = 'transmit_end',
  EndTransmitAck = 'transmit_end_ack',
}

export const createJsonData = (
  type: MessageType | string,
  payload: Record<string, any>,
): string => {
  return JSON.stringify({
    type,
    payload,
  })
}

export interface FileTransmissionData {
  name?: string
  sizeSent?: number
  body?: Buffer
  bodyParts?: Buffer[]
}

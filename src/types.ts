export enum UdpMessageType {
  ACCEPT_LEADER = 'accept_leader',
  HTTP_CREDENTIALS = 'http_credentials',
}

export interface Credentials {
  port: number
  host: string
  secret?: string
}
export enum UdpMessageType {
  ACCEPT_LEADER = 'accept_leader',
  HTTP_CREDENTIALS = 'http_credentials',
  DATA_REPLICATION_INSERT = 'data_replication',
  DATA_REPLICATION_DELETE = 'data_replication_delete',
  DATA_REPLICATION_UPDATE = 'data_replication_delete',
}

export interface Credentials {
  port: number
  host: string
  secret?: string
}
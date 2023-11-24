import * as colorette from 'colorette'
import dgram from 'dgram'
import { DataSource } from 'typeorm'

import { Credentials } from './types'
import { ElectroScooter } from './entities/electro-scooter.entity'

export function log(...args: any[]): void {
  console.log(colorette.greenBright(`[${process.pid}]`), ...args)
}

export function udpLog(...args: any[]): void {
  log(colorette.blueBright('[UDP]'), ...args)
}

export function httpLog(...args: any[]): void {
  log(colorette.blueBright('[HTTP]'), ...args)
}

// Checks if a UDP port is occupied
export function isUdpPortBusy(port: number): Promise<boolean> {
  return new Promise((res, rej) => {
    const socket = dgram.createSocket('udp4')

    socket
      .once('listening', () => {
        setImmediate(() => {
          socket.close()
          res(false)
        })
      })
      .once('error', () => {
        setImmediate(() => {
          res(true)
        })
      })

    socket.bind(port)
  })
}

export async function createDataSource(credentials: Credentials): Promise<DataSource> {
  let db: string

  switch (credentials.port) {
    case 3000:
      db = 'electro_scooter'
      break
    case 3001:
      db = 'electro_scooter_replica_1'
      break
    case 3002:
      db = 'electro_scooter_replica_2'
      break
  }

  const ds = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'warek',
    password: 'warek',
    schema: 'public',
    synchronize: true,
    database: db,
    entities: [ElectroScooter],
  })

  await ds.initialize()

  return ds
}
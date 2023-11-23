import express from 'express'
import path from 'path'
import swaggerUi from 'swagger-ui-express'
import * as colorette from 'colorette'
import dgram from 'dgram'
import cluster from 'cluster'
import cors from 'cors'

import swaggerDocument from './swagger.json'
import { dataSource } from './data-source'
import { ElectroScooter } from './entities/electro-scooter.entity'

enum UdpMessageType {
  ACCEPT_LEADER = 'accept_leader',
  HTTP_CREDENTIALS = 'http_credentials',
}

interface Credentials {
  port: number
  host: string
}

const { pid } = process
const ports = [3000, 3001, 3002]
const mainPort = ports[0]
// let port: number
//
// if (cluster.isPrimary) {
//   port = ports[0]
//   cluster.fork({ UDP_PORT: ports[1] })
//   cluster.fork({ UDP_PORT: ports[2] })
// } else {
//   port = parseInt(process.env['UDP_PORT'])
// }

main()

// ----------------------------------------
async function main() {
  await dataSource.initialize()
  const scooterRepo = dataSource.getRepository(ElectroScooter)

  const app = express()

  let port = 3000

  while (await isUdpPortBusy(port)) {
    port++
  }

  let isLeader = port === mainPort
  log(isLeader ? 'Leader' : 'Follower')

  const credentials: Credentials = {
    host: '127.0.0.1',
    port,
  }
  const followerCredentials: Record<number, Credentials> = {}
  let leaderCredentials: Credentials | null = isLeader ? credentials : null

  const udpSocket = dgram.createSocket('udp4')

  const acceptedBy = []
  udpSocket.on('message', (buff, remoteInfo) => {
    const str = buff.toString('utf8')
    const message = JSON.parse(str)

    if (isLeader) {
      switch (message.type) {
        case UdpMessageType.ACCEPT_LEADER: {
          acceptedBy.push(remoteInfo.port)
          udpLog(`${remoteInfo.port} sent leader approval`)

          if (acceptedBy.length === ports.length - 1) {
            log('Accepted by all followers. Starting the server')
            app.listen(port, () => httpLog(`Listening to 127.0.0.1:${port}`))

            ports
              .filter((p) => p !== mainPort)
              .forEach((p) =>
                udpSocket.send(
                  JSON.stringify({
                    type: UdpMessageType.HTTP_CREDENTIALS,
                    credentials,
                  }),
                  p,
                ),
              )
          }
        }
      }
    } else {
      switch (message.type) {
        case UdpMessageType.HTTP_CREDENTIALS: {
          leaderCredentials = message.credentials

          udpSocket.send(
            JSON.stringify({
              type: UdpMessageType.HTTP_CREDENTIALS,
              credentials,
            }),
            mainPort,
          )
        }
      }
    }
  })

  udpSocket.bind(port, '127.0.0.1', () => {
    udpLog(`Listening to 127.0.0.1:${port}`)

    if (!isLeader) {
      udpSocket.send(
        JSON.stringify({ type: UdpMessageType.ACCEPT_LEADER }),
        mainPort,
      )
    }
  })

  if (isLeader) {
    // Expose ui
    app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {}))
    app.use(express.static(path.join(__dirname, 'public')))
  }

  app.use(express.json())
  app.use(cors())
  app.use((req, res, next) => {
    httpLog(req.url)
    next()
  })

  if (isLeader) {
    app.route('/electro-scooters').post(async (req, res) => {
      try {
        const { body } = req

        const scooter = scooterRepo.create()
        scooter.name = body.name
        scooter.batteryLevel = body.batteryLevel ?? body.battery_level
        await scooterRepo.save(scooter)

        res.statusCode = 201
        res.send({ message: 'Electro Scooter created successfully' })
      } catch (e) {
        console.error(e)
        res.statusCode = 400
        res.send({ error: 'Invalid request data' })
      }
    })

    app
      .route('/electro-scooters/:id')

      .get((req, res) => {
        res.redirect(`http://localhost:3001${req.url}`)
      })

      .put(async (req, res) => {
        const { body } = req
        const id = parseInt(req.params.id)
        const scooter = await scooterRepo.findOneBy({ id })

        if (!scooter) {
          res.statusCode = 404
          res.send({ error: 'Electro Scooter not found' })
          return
        }

        scooter.name = body.name ?? scooter.name
        scooter.batteryLevel =
          body.batteryLevel ?? body.battery_level ?? scooter.batteryLevel
        await scooterRepo.save(scooter)

        res.statusCode = 200
        res.send({ message: 'Electro Scooter updated successfully' })
      })

      .delete(async (req, res) => {
        const id = parseInt(req.params.id)
        const scooter = await scooterRepo.findOneBy({ id })
        const password = req.headers['x-delete-password']

        if (password !== 'your_secret_password') {
          res.statusCode = 401
          res.send({ error: 'Incorrect password' })
          return
        }

        if (!scooter) {
          res.statusCode = 404
          res.send({ error: 'Electro Scooter not found' })
          return
        }

        await scooterRepo.delete(scooter)

        res.statusCode = 200
        res.send({ message: 'Electro Scooter deleted successfully' })
      })
  } else {
    app
      .route('/electro-scooters/:id')

      .get(async (req, res) => {
        const id = parseInt(req.params.id)
        const scooter = await scooterRepo.findOneBy({ id })

        if (!scooter) {
          res.statusCode = 404
          res.send({ error: 'Electro Scooter not found' })
          return
        }

        res.statusCode = 200
        res.send(scooter)
      })

    app.listen(port, () => httpLog(`Listening to 127.0.0.1:${port}`))
  }
}

function log(...args: any[]) {
  console.log(colorette.greenBright(`[${pid}]`), ...args)
}

function udpLog(...args: any[]) {
  log(colorette.blueBright('[UDP]'), ...args)
}

function httpLog(...args: any[]) {
  log(colorette.blueBright('[HTTP]'), ...args)
}

async function getUdpPort(start = 3000, end = 5000): Promise<number> {
  return new Promise((outResolve, outReject) => {
    let checkPort = (port: number) => {
      return new Promise((resolve, reject) => {
        let socket = dgram.createSocket('udp4')

        socket.bind(port)

        socket.on('listening', () => {
          setImmediate(() => socket.close())
          setImmediate(() => outResolve(port))
        })

        socket.on('error', (err) => {
          if (++port > end) outReject('NOPORTS')

          checkPort(port)
        })
      })
    }

    checkPort(start)
  })
}

function isUdpPortBusy(port: number): Promise<boolean> {
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

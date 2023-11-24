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
import { UdpMessageType, Credentials } from './types'

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
  const credentials: Credentials = {
    host: '127.0.0.1',
    port: 3000,
  }

  while (await isUdpPortBusy(credentials.port)) {
    credentials.port++
  }

  let isLeader = credentials.port === mainPort
  log(isLeader ? 'Leader' : 'Follower')

  if (isLeader) {
    // Only leader knows at beginning secret, then sends it to followers
    credentials.secret = 'your_secret_password'
  }

  const followerCredentials: Credentials[] = []
  let leaderCredentials: Credentials | null = isLeader ? credentials : null

  await dataSource.initialize()

  const scooterRepo = dataSource.getRepository(ElectroScooter)
  const app = express()
  const udpSocket = dgram.createSocket('udp4')

  // Should be accepted by all follower ports
  const acceptedBy: number[] = []

  udpSocket.on('message', (buff, remoteInfo) => {
    const str = buff.toString('utf8')
    const message = JSON.parse(str)

    if (isLeader) {
      // Leader messages
      switch (message.type) {
        case UdpMessageType.ACCEPT_LEADER: {
          acceptedBy.push(remoteInfo.port)
          udpLog(`${remoteInfo.port} sent leader approval`)

          // If accepted by all followers
          if (acceptedBy.length === ports.length - 1) {
            log('Accepted by all followers. Starting the server')
            app.listen(credentials.port, () =>
              httpLog(`Listening to ${credentials.host}:${credentials.port}`),
            )

            // Send credentials to all followers
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

          break
        }

        case UdpMessageType.HTTP_CREDENTIALS : {
          followerCredentials.push(message.credentials)
          break
        }
      }
    } else {
      // Follower messages
      switch (message.type) {
        case UdpMessageType.HTTP_CREDENTIALS: {
          leaderCredentials = message.credentials

          // Received leader credentials, send own
          udpSocket.send(
            JSON.stringify({
              type: UdpMessageType.HTTP_CREDENTIALS,
              credentials,
            }),
            mainPort,
          )
          break
        }
      }
    }
  })

  udpSocket.bind(credentials.port, credentials.host, () => {
    udpLog(`Listening to ${credentials.host}:${credentials.port}`)

    if (!isLeader) {
      // Send accept to leader as soon as starts
      udpSocket.send(
        JSON.stringify({ type: UdpMessageType.ACCEPT_LEADER }),
        mainPort,
      )
    }
  })

  if (isLeader) {
    // Expose swagger ui
    app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {}))
  }

  app.use(express.json())
  app.use(cors())
  app.use((req, res, next) => {
    httpLog(req.method, req.url)
    next()
  })

  // Both leader and followers accept read
  app.get('/electro-scooters/:id', async (req, res) => {
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

  if (isLeader) {
    // Config leader http endpoints

    // Redirect writes to a random follower
    app.post('/electro-scooters', (req, res) => {
      let credential = followerCredentials[Math.floor(Math.random() * followerCredentials.length)]
      const url = `http://${credential.host}:${credential.port}/electro-scooters`
      httpLog(`Redirecting to ${url}`)
      res.redirect(307, url)
    })

    app
      .route('/electro-scooters/:id')

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

        if (password !== leaderCredentials.secret) {
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
    // Config follower http endpoints

    app.post('/electro-scooters', async (req, res) => {
      try {
        const { body } = req

        const password = req.headers['x-delete-password']

        if (password !== leaderCredentials.secret) {
          res.statusCode = 401
          res.send({ error: 'Incorrect password' })
          return
        }

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

    app.listen(credentials.port, () =>
      httpLog(`Listening to ${credentials.host}:${credentials.port}`),
    )
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

// Checks if a UDP port is occupied
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

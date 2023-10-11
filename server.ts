import { createServer, Server, Socket } from 'net'
import fs from 'fs/promises'
import path from 'path'

import {
  APP_HOST,
  APP_PORT,
  createJsonData,
  FileTransmissionData,
  MAX_FILE_PAYLOAD_SIZE,
  MessageType,
} from './shared.ts'

const server: Server = createServer()

const rooms: Record<string, Socket[]> = {}
const allSockets: Socket[] = []
const file: FileTransmissionData = {
  name: null,
  body: null,
  sizeSent: null,
  bodyParts: null,
}

server
  .on('connection', handleConnection)
  .on('close', () => console.log('Connection closed'))
  .on('drop', () => console.log('Connection dropped'))

server.listen(
  {
    port: APP_PORT,
    host: APP_HOST,
    ipv6Only: false,
  },
  () => console.log(`Listening to ${APP_HOST}:${APP_PORT}`),
)

async function handleConnection(socket: Socket) {
  console.log(`Connection from ${socket.remoteAddress}:${socket.remotePort}`)
  allSockets.push(socket)

  socket.on('data', async (buffer) => {
    const json = JSON.parse(buffer.toString('utf8'))

    const { type, payload } = json
    const { room } = payload
    let response: any = null
    let shouldBroadcast: boolean = false

    switch (type) {
      case MessageType.Connect:
        Array.isArray(rooms[room])
          ? rooms[room].push(socket)
          : (rooms[room] = [socket])

        response = createJsonData(MessageType.ConnectionAck, {
          message: `${payload.name} connected to room ${room}`,
        })
        break

      case MessageType.Message:
        response = createJsonData(MessageType.Notification, {
          message: payload.text,
        })
        break

      case MessageType.Shutdown: {
        console.log('Shutting down ...')

        allSockets.forEach((s) => {
          s.write(createJsonData(MessageType.Shutdown, {}))
        })

        return process.exit(0)
      }

      case MessageType.TransmitChunk: {
        const { chunk } = payload
        const buff: Buffer = Buffer.from(chunk, 'base64')
        file.bodyParts.push(buff)

        socket.write(createJsonData(MessageType.TransmitChunkAck, {}))
        break
      }

      case MessageType.StartTransmit: {
        const { name } = payload
        file.name = name
        file.sizeSent = 0
        file.bodyParts = []

        socket.write(createJsonData(MessageType.StartTransmitAck, {}))
        break
      }

      case MessageType.EndTransmit: {
        const { username } = payload
        const exists: boolean = await fs.exists(mediaPath(file.name))

        if (exists) {
          await fs.rm(mediaPath(file.name))
        }

        file.body = Buffer.concat(file.bodyParts)
        await fs.writeFile(mediaPath(file.name), file.body)

        shouldBroadcast = true
        response = createJsonData(MessageType.EndTransmitAck, {
          uploadFileName: file.name,
          uploadUsername: username,
        })

        file.body = null
        file.name = null
        file.sizeSent = null
        file.bodyParts = null
        break
      }

      case MessageType.Download: {
        const { name } = payload
        const exists: boolean = await fs.exists(mediaPath(name))

        if (!exists) {
          socket.write(
            createJsonData(MessageType.Notification, {
              message: `File "${name}" doesn't exist`,
            }),
          )
          break
        }

        file.name = name
        file.sizeSent = 0
        file.body = await fs.readFile(mediaPath(name))

        socket.write(
          createJsonData(MessageType.StartTransmit, {
            name: file.name,
          }),
        )

        break
      }

      case MessageType.StartTransmitAck:
      case MessageType.TransmitChunkAck: {
        if (file.sizeSent === file.body.length) {
          socket.write(createJsonData(MessageType.EndTransmit, {}))
          break
        }

        const chunk: Buffer = file.body.subarray(
          file.sizeSent,
          file.sizeSent + MAX_FILE_PAYLOAD_SIZE,
        )
        file.sizeSent += chunk.length

        socket.write(
          createJsonData(MessageType.TransmitChunk, {
            chunk: chunk.toString('base64'),
          }),
        )

        break
      }

      case MessageType.EndTransmitAck:
        const { uploadUsername, uploadFileName } = payload
        response = createJsonData(MessageType.EndTransmitAck, {
          uploadFileName,
          uploadUsername,
        })
        file.sizeSent = null
        file.body = null
        file.name = null
        break
    }

    if (shouldBroadcast) {
      allSockets.forEach((s) => {
        s.write(response)
      })
    } else if (response) {
      rooms[room].forEach((s) => {
        s.write(response)
      })
    }
  })
}

function mediaPath(file: string): string {
  return path.join(import.meta.dir, 'media', file)
}

import { createConnection, Socket } from 'net'
import fs from 'fs/promises'

import {
  APP_HOST,
  APP_PORT,
  createJsonData,
  FileTransmissionData,
  MAX_FILE_PAYLOAD_SIZE,
  MessageType,
} from './shared.ts'

const file: FileTransmissionData = {
  body: null,
  name: null,
  sizeSent: null,
  bodyParts: null,
}

const client: Socket = createConnection({
  port: APP_PORT,
  host: APP_HOST,
})

let username: string = 'Unknown user'
let room: string = 'default'

client
  .on('connect', handleConnection)
  .on('data', handleData)
  .on('close', () => {
    console.log('Connection closed')
    process.exit(0)
  })
  .on('end', () => {
    console.log('Connection ended')
    process.exit(0)
  })
  .on('timeout', () => {
    console.log('Connection timeout')
    process.exit(0)
  })
  .on('error', (err) => {
    console.log('Connection error', err)
    process.exit(1)
  })

async function handleConnection() {
  console.log('Connected')

  for await (const fullLine of console) {
    if (fullLine === 'exit') {
      client.write(createJsonData(MessageType.Shutdown, {}))
      console.log('Goodbye')
      process.exit(0)
    } else if (!fullLine.includes(':')) {
      continue
    }

    const [command, ...otherLine] = fullLine.split(': ')
    const text: string = otherLine.join()

    switch (command) {
      case MessageType.Connect:
        ;[room, username] = text.split(' ')
        client.write(
          createJsonData(MessageType.Connect, { room, name: username }),
        )
        break

      case MessageType.Message:
        client.write(
          createJsonData(MessageType.Message, { room, name: username, text }),
        )
        break

      case MessageType.Upload: {
        const exists: boolean = await fs.exists(text)

        if (!exists) {
          console.log(`File ${text} doesn't exist`)
          break
        }

        file.name = text
        file.body = await fs.readFile(file.name)

        file.sizeSent = 0

        client.write(
          createJsonData(MessageType.StartTransmit, {
            name: file.name,
          }),
        )
        break
      }

      case MessageType.Download: {
        file.name = text
        file.bodyParts = []
        file.sizeSent = 0
        file.body = null

        client.write(
          createJsonData(MessageType.Download, {
            name: file.name,
          }),
        )
        break
      }
    }
  }
}

async function handleData(buffer: Buffer) {
  const json = JSON.parse(buffer.toString('utf8'))
  const { type, payload } = json

  switch (type) {
    case MessageType.ConnectionAck:
      console.log(payload.message)
      break

    case MessageType.Notification:
      console.log(payload.message)
      break

    case MessageType.Shutdown:
      console.log('Shutting down ...')
      return process.exit(0)

    case MessageType.StartTransmit: {
      const { name } = payload
      file.name = name
      file.sizeSent = 0
      file.bodyParts = []

      client.write(createJsonData(MessageType.StartTransmitAck, {}))
      break
    }

    case MessageType.TransmitChunk: {
      const { chunk } = payload
      const buff: Buffer = Buffer.from(chunk, 'base64')
      file.bodyParts.push(buff)

      client.write(createJsonData(MessageType.TransmitChunkAck, {}))
      break
    }

    case MessageType.EndTransmit: {
      const exists: boolean = await fs.exists(file.name)

      if (exists) {
        await fs.rm(file.name)
      }

      file.body = Buffer.concat(file.bodyParts)
      await fs.writeFile(file.name, file.body)

      console.log(`File "${file.name}" downloaded successfully`)

      file.body = null
      file.name = null
      file.sizeSent = null
      file.bodyParts = null
      break
    }

    case MessageType.StartTransmitAck:
    case MessageType.TransmitChunkAck: {
      if (file.sizeSent === file.body.length) {
        client.write(
          createJsonData(MessageType.EndTransmit, { username }),
        )
        break
      }

      const chunk: Buffer = file.body.subarray(
        file.sizeSent,
        file.sizeSent + MAX_FILE_PAYLOAD_SIZE,
      )
      file.sizeSent += chunk.length

      client.write(
        createJsonData(MessageType.TransmitChunk, {
          chunk: chunk.toString('base64'),
        }),
      )

      break
    }

    case MessageType.EndTransmitAck:
      const { uploadUsername, uploadFileName } = payload
      console.log(`${uploadUsername} uploaded "${uploadFileName}"`)
      file.sizeSent = null
      file.body = null
      file.name = null
      break
  }
}

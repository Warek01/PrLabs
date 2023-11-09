// Testing script that adds one link to queue

import amqp from 'amqplib'
import { appAmqpOptions } from './shared'

const amqpConnection: amqp.Connection = await amqp.connect(appAmqpOptions.url, {
  credentials: appAmqpOptions.credentials,
})

const amqpChannel: amqp.Channel = await amqpConnection.createChannel()

await amqpChannel.assertQueue(appAmqpOptions.queue, {
  durable: false,
})

amqpChannel.sendToQueue(
  appAmqpOptions.queue,
  Buffer.from(JSON.stringify(['https://999.md/ro/83810069'])),
)

setTimeout(() => process.exit(), 200)

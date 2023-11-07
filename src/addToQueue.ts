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
  Buffer.from('["https://999.md/ro/83810069","https://999.md/ro/82910472","https://999.md/ro/84862081"]'),
  {},
)

setTimeout(() => process.exit(), 200)

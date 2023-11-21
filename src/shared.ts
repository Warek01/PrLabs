import amqp from 'amqplib'
import { DataSourceOptions } from 'typeorm'

import { Item } from './entities/item.entity'
import { Batch } from './entities/batch.entity'
import * as colorette from 'colorette'
import { JSDOM } from 'jsdom'

export const appAmqpOptions = {
  url: 'amqp://localhost',
  queue: 'scraping_queue',
  credentials: amqp.credentials.plain('warek', 'warek'),
}

export const baseUrl = 'https://999.md'

export const appDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: 'localhost',
  database: 'pr_lab2',
  schema: 'public',
  synchronize: true,
  port: 5432,
  username: 'warek',
  password: 'warek',
  entities: [Item, Batch],
}


export async function loadDocument(url: string): Promise<Document | null> {
  const req = await fetch(url, {
    credentials: 'omit',
    cache: 'only-if-cached',
    keepalive: false,
    timeout: true,
  })

  if (!req.ok) {
    console.log(
      colorette.redBright(`Error while loading page ${url}`),
      colorette.blueBright(req.status + ' ' + req.statusText),
    )

    return null
  }

  const html = await req.text()
  const dom = new JSDOM(html)

  return dom.window.document
}

export async function createAmqpConnection(): Promise<amqp.Channel> {
  const amqpConnection = await amqp.connect(appAmqpOptions.url, {
    credentials: appAmqpOptions.credentials,
  })

  const amqpChannel = await amqpConnection.createChannel()

  await amqpChannel.assertQueue(appAmqpOptions.queue, {
    durable: false,
  })

  amqpChannel.on('close', () => amqpConnection.close())

  return amqpChannel
}

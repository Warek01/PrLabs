import amqp from 'amqplib'
import { HTTPRequest, PuppeteerLaunchOptions } from 'puppeteer'
import { DataSourceOptions } from 'typeorm'

import { Item } from './entities/item.entity'
import { Batch } from './entities/batch.entity'

export const appAmqpOptions = {
  url: 'amqp://localhost',
  queue: 'scraping_queue',
  credentials: amqp.credentials.plain('warek', 'warek'),
}

export const appBrowserOptions: PuppeteerLaunchOptions = {
  headless: false,
  waitForInitialPage: false,
  product: 'chrome',
  channel: 'chrome',
  ignoreHTTPSErrors: true,
  debuggingPort: 8888,
}

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

export const requestInterceptorAllowOnlyDocument = (request: HTTPRequest) =>
  request.resourceType() === 'document' ? request.continue() : request.abort()

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

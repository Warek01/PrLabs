import amqp from 'amqplib'
import {
  ConsoleMessage,
  ConsoleMessageType,
  HTTPRequest,
  PuppeteerLaunchOptions,
} from 'puppeteer'
import * as colorette from 'colorette'
import { DataSourceOptions } from 'typeorm'
import { Item } from './entities/item.entity'

export const appAmqpOptions = {
  url: 'amqp://localhost',
  queue: 'scraping_queue',
  credentials: amqp.credentials.plain('warek', 'warek'),
}

export const appBrowserOptions: PuppeteerLaunchOptions = {
  headless: false,
  devtools: false,
  waitForInitialPage: false,
  product: 'chrome',
  channel: 'chrome',
  defaultViewport: {
    height: 720,
    width: 1280,
    hasTouch: false,
    isMobile: false,
    isLandscape: true,
    deviceScaleFactor: 1,
  },
  ignoreHTTPSErrors: false,
  args: ['--disable-features=site-per-process'],
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
  entities: [Item],
}

export function requestInterceptor(request: HTTPRequest): void {
  switch (request.resourceType()) {
    case 'image':
    case 'stylesheet':
    case 'font':
    case 'media':
      request.abort()
      break

    default:
      request.continue()
  }
}

export function onPageConsoleMessage(message: ConsoleMessage): void {
  const type: ConsoleMessageType = message.type()
  const text: string = message.text()

  if (type === 'log') {
    console.log(`${colorette.blue('Browser:')} ${colorette.blueBright(text)}`)
  }
}

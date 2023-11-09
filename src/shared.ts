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
  ignoreHTTPSErrors: true,
  defaultViewport: {
    height: 800,
    width: 600,
    hasTouch: false,
    isMobile: false,
    isLandscape: true,
    deviceScaleFactor: 1,
  },
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

export async function requestInterceptor(request: HTTPRequest): Promise<void> {
  const type = request.resourceType()

  const shouldBlock: (typeof type)[] = [
    'image',
    'stylesheet',
    'websocket',
    'eventsource',
    'cspviolationreport',
    'font',
    'media',
  ]

  // console.log(type, shouldBlock.includes(type))

  if (shouldBlock.includes(type)) {
    await request.abort()
  } else {
    await request.continue()
  }
}

export function onPageConsoleMessage(message: ConsoleMessage): void {
  const type: ConsoleMessageType = message.type()
  const text: string = message.text()

  const supportedTypes: ConsoleMessageType[] = ['log', 'error', 'warning']

  const colors: Partial<Record<ConsoleMessageType, colorette.Color>> = {
    log: colorette.blueBright,
    warning: colorette.yellowBright,
    error: colorette.redBright,
  }

  if (supportedTypes.includes(type)) {
    console.log(colors[type](`${colorette.underline('Browser:')} ${text}`))
  }
}

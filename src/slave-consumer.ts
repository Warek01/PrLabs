import amqp from 'amqplib'
import * as colorette from 'colorette'
import puppeteer, { Browser, Page } from 'puppeteer'
import { DataSource, Repository } from 'typeorm'

import {
  appAmqpOptions,
  appBrowserOptions,
  appDataSourceOptions,
  requestInterceptor,
} from './shared'
import { Item } from './entities/item.entity'

const browser: Browser = await puppeteer.launch(appBrowserOptions)
const dataSource: DataSource = new DataSource(appDataSourceOptions)
const amqpConnection: amqp.Connection = await amqp.connect(appAmqpOptions.url, {
  credentials: appAmqpOptions.credentials,
})

try {
  process.on('SIGTERM', async () => {
    log('Terminating')
    await dispose()
    log('Terminated')
    process.exit(0)
  })

  await dataSource.initialize()
  const itemRepo: Repository<Item> = dataSource.getRepository(Item)
  const amqpChannel: amqp.Channel = await amqpConnection.createChannel()

  const page: Page = await browser.newPage()
  await page.setRequestInterception(true)
  page.on('request', requestInterceptor)

  await amqpChannel.assertQueue(appAmqpOptions.queue, {
    durable: false,
  })

  while (true) {
    const data = await amqpChannel.get(appAmqpOptions.queue, { noAck: true })

    if (data === false) {
      // Do nothing ig
    } else {
      const anchors: string[] = JSON.parse(data.content.toString('utf8'))

      await getTransportData(anchors)
    }
  }

  async function getTransportData(anchors: string[]): Promise<void> {
    for (const anchor of anchors) {
      log(`Navigating to ${anchor}`)
      await page.goto(anchor, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('header')
      log(`Got ${anchor}`)

      const item = new Item()
      item.url = anchor

      const titleElement = await page.$('header.adPage__header')
      item.title = await titleElement?.evaluate(
        (e) => e.textContent?.trim() ?? null,
      )
      await titleElement?.dispose()

      const descriptionElement = await page.$(
        'div.adPage__content__description',
      )
      item.description = await descriptionElement?.evaluate(
        (e) => e.textContent?.trim() ?? null,
      )
      await descriptionElement?.dispose()

      const pricesElement = await page.$$(
        'ul.adPage__content__price-feature__prices li',
      )
      if (pricesElement) {
        item.prices = {}

        for (const li of pricesElement) {
          const text = await li.evaluate((e) => e.textContent.trim())
          let currency: keyof Item['prices'] = 'lei'

          if (text.includes('$')) {
            currency = 'dollars'
          } else if (text.includes('€')) {
            currency = 'euros'
          }

          const matches = text.matchAll(/\d+/g)
          let allDigits = ''

          for (const match of matches) {
            allDigits += match
          }

          item.prices[currency] = parseFloat(allDigits)

          await li.dispose()
        }
      }

      await itemRepo.save(item)

      log(`Finished ${anchor}`)

      // Shutter random between 1 and 100 ms
      await new Promise((res) =>
        setTimeout(() => res(null), Math.random() * 10),
      )
    }
  }
} finally {
  await dispose()
}

function log(arg: string): void {
  console.log(`${colorette.blue(`Slave(${process.pid})`)}: ${arg}`)
}

async function dispose(): Promise<void> {
  await Promise.all([
    browser.close(),
    dataSource.destroy(),
    amqpConnection.close(),
  ])
}

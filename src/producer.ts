import amqp from 'amqplib'
import puppeteer, { Page, Browser } from 'puppeteer'

import {
  appBrowserOptions,
  appAmqpOptions,
  onPageConsoleMessage,
  requestInterceptor,
} from './shared'

process
  .on('SIGINT', onTerminate)
  .on('SIGTERM', onTerminate)
  .on('SIGKILL', onTerminate)

const initialPageUrl = 'https://999.md/ro/list/transport/cars?page='
const browser: Browser = await puppeteer.launch(appBrowserOptions)
const page: Page = await browser.newPage()

await page.setRequestInterception(true)
page.on('console', onPageConsoleMessage).on('request', requestInterceptor)

const amqpConnection: amqp.Connection = await amqp.connect(appAmqpOptions.url, {
  credentials: appAmqpOptions.credentials,
})
const amqpChannel: amqp.Channel = await amqpConnection.createChannel()

await amqpChannel.assertQueue(appAmqpOptions.queue, {
  durable: false,
})

try {
  await extractLinks(page, 1, 2)
} catch (e) {
  console.error(e)
}

await page.close()
await browser.close()
await amqpChannel.close()
await amqpConnection.close()
process.exit(0)

async function extractLinks(
  page: Page,
  pageIndex: number,
  maxPageIndex: number,
): Promise<null> {
  const url: string = initialPageUrl + pageIndex

  console.log(`Requesting ${url}`)
  await page.goto(url, { waitUntil: 'load' })

  // await page.waitForSelector('.ads-list-photo')
  const anchors = await page.$$(
    '.ads-list-photo .ads-list-photo-item:not(:has(span.booster-label)) a.js-item-ad',
  )

  const linksBatch: Set<string> = new Set<string>() // Set to exclude duplicates

  for (const anchor of anchors) {
    linksBatch.add(await page.evaluate((a) => a.href, anchor))
  }

  console.log(`Sent a batch of ${linksBatch.size} links`)

  amqpChannel.sendToQueue(
    appAmqpOptions.queue,
    Buffer.from(JSON.stringify(Array.from(linksBatch))), // Must be Array to be stringified properly
  )

  const paginator = await page.$('.paginator')

  const hasNext: boolean =
    !!paginator &&
    (await paginator.$eval(
      'li:last-child',
      (li) => !li.classList.contains('current'), // If last pagination button is selected
    ))

  if (!hasNext) {
    console.log(`No more pages left at ${pageIndex}`)
  }

  return hasNext && pageIndex <= maxPageIndex
    ? extractLinks(page, pageIndex + 1, maxPageIndex)
    : null
}

async function onTerminate(): Promise<void> {
  await Promise.all([browser.close(), amqpConnection.close()])
  process.exit(0)
}

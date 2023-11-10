import amqp from 'amqplib'
import puppeteer, { Page, Browser } from 'puppeteer'

import {
  appBrowserOptions,
  appAmqpOptions,
  requestInterceptorAllowOnlyDocument,
  createAmqpConnection,
} from './shared'
import * as colorette from 'colorette'

console.time('Execution time')

const browser: Browser = await puppeteer.launch(appBrowserOptions)
const pages: Page[] = await browser.pages()
const page: Page = pages.at(0) || (await browser.newPage())

await page.setRequestInterception(true)
page
  .on('request', requestInterceptorAllowOnlyDocument)
  .on('close', () => browser.close())

const amqpChannel: amqp.Channel = await createAmqpConnection()
process
  .on('SIGINT', () => browser.close())
  .on('SIGTERM', () => browser.close())
  .on('SIGKILL', () => browser.close())

try {
  await extractLinks(page, 1, 20)
  console.timeEnd('Execution time')
} catch (e) {
  console.error(e)
} finally {
  await page.close()
  await browser.close()
  await amqpChannel.close()
}

async function extractLinks(
  page: Page,
  pageIndex: number,
  maxPageIndex: number,
): Promise<null> {
  const url: string = 'https://999.md/ro/list/transport/cars?page=' + pageIndex
  console.log(`Requesting ${url}`)

  await page.goto(url)
  await page.waitForSelector('.ads-list-photo')

  const anchors = await page.$$(
    '.ads-list-photo .ads-list-photo-item:not(:has(span.booster-label)) a.js-item-ad',
  )

  const linksBatch: Set<string> = new Set<string>()

  for (const anchor of anchors) {
    linksBatch.add(await page.evaluate((a) => a.href, anchor))
  }

  console.log(`Sent ${colorette.greenBright(linksBatch.size)} links`)

  amqpChannel.sendToQueue(
    appAmqpOptions.queue,
    Buffer.from(JSON.stringify(Array.from(linksBatch))),
  )

  const paginator = await page.$('.paginator')

  const hasNext: boolean =
    !!paginator &&
    (await paginator.$eval(
      'li:last-child',
      (li) => !li.classList.contains('current'),
    ))

  if (!hasNext) {
    console.log(`No more pages left at ${pageIndex}`)
  }

  return hasNext && pageIndex <= maxPageIndex
    ? extractLinks(page, pageIndex + 1, maxPageIndex)
    : null
}

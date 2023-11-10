import amqp from 'amqplib'
import * as colorette from 'colorette'
import puppeteer from 'puppeteer'
import { DataSource, Repository } from 'typeorm'

import {
  appAmqpOptions,
  appDataSourceOptions,
  requestInterceptorAllowOnlyDocument,
} from './shared'
import { Item } from './entities/item.entity'

process
  .once('SIGTERM', onTerminate)
  .once('SIGKILL', onTerminate)
  .once('SIGINT', onTerminate)

const browser = await puppeteer.launch({
  ignoreHTTPSErrors: true,
  defaultViewport: {
    isLandscape: true,
    isMobile: false,
    width: 1280,
    height: 720,
    hasTouch: false,
    deviceScaleFactor: 1,
  },
  headless: 'new',
  waitForInitialPage: false,
  product: 'chrome',
  channel: 'chrome',
})

const dataSource: DataSource = new DataSource(appDataSourceOptions)
const amqpConnection: amqp.Connection = await amqp.connect(appAmqpOptions.url, {
  credentials: appAmqpOptions.credentials,
})

try {
  await dataSource.initialize()
  const itemRepo: Repository<Item> = dataSource.getRepository(Item)
  const amqpChannel: amqp.Channel = await amqpConnection.createChannel()

  const page = await browser.newPage()
  await page.setRequestInterception(true)
  page.on('request', requestInterceptorAllowOnlyDocument)

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
      await page.goto(anchor)
      await page.waitForSelector('header')

      const item = new Item()
      item.url = anchor

      const titleElement = await page.$('header.adPage__header')
      item.title = await titleElement?.evaluate(
        (e) => e.textContent?.trim() ?? null,
      )
      titleElement?.dispose()

      const descriptionElement = await page.$(
        'div.adPage__content__description',
      )
      item.description = await descriptionElement?.evaluate(
        (e) => e.textContent?.trim() ?? null,
      )
      descriptionElement?.dispose()

      const pricesElement = await page.$$(
        'ul.adPage__content__price-feature__prices li',
      )
      if (pricesElement) {
        item.prices = {
          negotiable: false,
        }

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

          if (allDigits.length) {
            item.prices[currency] = parseFloat(allDigits)
          } else {
            item.prices.negotiable = true
          }

          li.dispose()
        }
      }

      const regionElement = await page.$('dl.adPage__content__region')
      item.region = await regionElement?.$$eval('dd', (elements) =>
        elements
          .map((e) => e.textContent.replaceAll(',', '').trim())
          .join(', '),
      )
      regionElement?.dispose()

      const featuresElement = await page.$$(
        '.adPage__content__features__col ul',
      )
      if (featuresElement) {
        item.features = {}
        item.otherFeatures = []

        for (const feature of featuresElement) {
          const allLi = await feature.$$('li')

          for (const li of allLi) {
            const key = await li.$eval('[itemprop=name]', (e) =>
              e.textContent.trim(),
            )
            const valueElement = await li.$('[itemprop=value]')

            if (valueElement) {
              item.features[key] = await valueElement.evaluate((e) =>
                e.textContent.trim(),
              )
            } else {
              item.otherFeatures.push(key)
            }

            valueElement?.dispose()
            li.dispose()
          }
          feature.dispose()
        }
      }

      const categoriesElement = await page.$('#m__breadcrumbs')
      if (categoriesElement) {
        item.categories = await categoriesElement.$$eval(
          'li:not(:last-child)',
          (lis) => lis.map((li) => li.textContent.trim()),
        )
      }
      categoriesElement?.dispose()

      const ownerElement = await page.$('.adPage__aside__stats__owner__login')
      if (ownerElement) {
        item.owner = {
          url: await ownerElement.evaluate((e) => e.href),
          name: await ownerElement.evaluate((e) => e.textContent.trim()),
        }
      }
      ownerElement?.dispose()

      const viewsElement = await page.$('.adPage__aside__stats__views')
      if (viewsElement) {
        item.views = await viewsElement.evaluate((e) =>
          parseInt(
            e.textContent
              .split(':')[1]
              .split('(')[0]
              .trim()
              .replaceAll(' ', ''),
          ),
        )
      }
      viewsElement?.dispose()

      const typeElement = await page.$('.adPage__aside__stats__type')
      if (typeElement) {
        item.type = await typeElement.evaluate((e) =>
          e.textContent.split(':')[1].trim(),
        )
      }
      typeElement?.dispose()

      const dateElement = await page.$('.adPage__aside__stats__date')
      if (dateElement) {
        item.date = await dateElement.evaluate((e) =>
          e.textContent.split(':').slice(1).join(':').trim(),
        )
      }
      dateElement?.dispose()

      const phoneElement = await page.$('.adPage__content__phone a')
      if (phoneElement) {
        item.phone = await phoneElement.evaluate((a) =>
          a.href.split(':')[1].trim(),
        )
      }
      phoneElement?.dispose()

      item.photos = []
      const photosElements = await page.$$('#js-ad-photos img')
      for (const photo of photosElements) {
        item.photos.push(await photo.evaluate((img) => img.src))
        photo.dispose()
      }

      await itemRepo.save(item)

      log(`Scraped ${anchor}`)

      // await new Promise((res) =>
      //   setTimeout(() => res(null), Math.random() * 200),
      // )
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

async function onTerminate() {
  log('Terminating')
  await dispose()
  log('Terminated')
  process.exit(0)
}

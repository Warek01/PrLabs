import amqp from 'amqplib'
import * as colorette from 'colorette'
import { DataSource, Repository } from 'typeorm'

import {
  appAmqpOptions,
  appDataSourceOptions,
  baseUrl,
  loadDocument,
} from './shared'
import { Item } from './entities/item.entity'

const dataSource: DataSource = new DataSource(appDataSourceOptions)
const amqpConnection: amqp.Connection = await amqp.connect(appAmqpOptions.url, {
  credentials: appAmqpOptions.credentials,
})

try {
  await dataSource.initialize()
  const itemRepo: Repository<Item> = dataSource.getRepository(Item)
  const amqpChannel: amqp.Channel = await amqpConnection.createChannel()

  await amqpChannel.assertQueue(appAmqpOptions.queue, {
    durable: false,
  })

  while (true) {
    const message = await amqpChannel.get(appAmqpOptions.queue, {
      noAck: false,
    })

    if (message) {
      const content: string = message.content.toString('utf8')
      const anchors: string[] = JSON.parse(content)
      await getTransportData(anchors)
      amqpChannel.ack(message)
    }
  }

  async function getTransportData(anchors: string[]): Promise<void> {
    const promises: Promise<void>[] = []
    for (const anchor of anchors) {
      promises.push(
        (async () => {
          const url = baseUrl + anchor
          const document = await loadDocument(url)

          const item = new Item()
          item.url = url
          item.categories = []
          item.features = {}
          item.otherFeatures = []
          item.prices = {
            negotiable: true,
          }

          item.title = document
            .querySelector('header.adPage__header')
            .textContent.trim()
          item.description = document
            .querySelector('div.adPage__content__description')
            ?.textContent.trim()

          const pricesElement = document.querySelectorAll(
            'ul.adPage__content__price-feature__prices li',
          )

          if (pricesElement.length) {
            item.prices.negotiable = false

            for (const li of pricesElement) {
              const text = li.textContent.trim()
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
            }
          }

          item.region = Array.from(
            document.querySelectorAll<HTMLDataElement>(
              'dl.adPage__content__region dd',
            ),
          )
            .map((dd) => dd.textContent.replaceAll(',', '').trim())
            .join(', ')

          Array.from(
            document.querySelectorAll('.adPage__content__features__col li'),
          ).forEach((li) => {
            const key = li
              .querySelector('.adPage__content__features__key')
              .textContent.trim()

            const value = li
              .querySelector('.adPage__content__features__value')
              ?.textContent.trim()

            if (value) item.features[key] = value
            else item.otherFeatures.push(key)
          })

          Array.from(document.querySelectorAll('#m__breadcrumbs li'))
            .slice(0, -1)
            .forEach((li) => item.categories.push(li.textContent.trim()))

          // const ownerElement = await page.$('.adPage__aside__stats__owner__login')
          // if (ownerElement) {
          //   item.owner = {
          //     url: await ownerElement.evaluate((e) => e.href),
          //     name: await ownerElement.evaluate((e) => e.textContent.trim()),
          //   }
          // }
          // ownerElement?.dispose()
          //
          // const viewsElement = await page.$('.adPage__aside__stats__views')
          // if (viewsElement) {
          //   item.views = await viewsElement.evaluate((e) =>
          //     parseInt(
          //       e.textContent
          //         .split(':')[1]
          //         .split('(')[0]
          //         .trim()
          //         .replaceAll(' ', ''),
          //     ),
          //   )
          // }
          // viewsElement?.dispose()
          //
          // const typeElement = await page.$('.adPage__aside__stats__type')
          // if (typeElement) {
          //   item.type = await typeElement.evaluate((e) =>
          //     e.textContent.split(':')[1].trim(),
          //   )
          // }
          // typeElement?.dispose()
          //
          // const dateElement = await page.$('.adPage__aside__stats__date')
          // if (dateElement) {
          //   item.date = await dateElement.evaluate((e) =>
          //     e.textContent.split(':').slice(1).join(':').trim(),
          //   )
          // }
          // dateElement?.dispose()
          //
          // const phoneElement = await page.$('.adPage__content__phone a')
          // if (phoneElement) {
          //   item.phone = await phoneElement.evaluate((a) =>
          //     a.href.split(':')[1].trim(),
          //   )
          // }
          // phoneElement?.dispose()
          //
          // item.photos = []
          // const photosElements = await page.$$('#js-ad-photos img')
          // for (const photo of photosElements) {
          //   item.photos.push(await photo.evaluate((img) => img.src))
          //   photo.dispose()
          // }

          await itemRepo.save(item)
        })().then(() => log(`Scraped ${anchor}`)),
      )
    }

    await Promise.all(promises)
  }
} finally {
  await Promise.all([dataSource.destroy(), amqpConnection.close()])
}

function log(arg: string): void {
  console.log(`${colorette.blue(`Slave(${process.pid})`)}: ${arg}`)
}

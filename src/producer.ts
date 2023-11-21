import amqp from 'amqplib'

import { appAmqpOptions, createAmqpConnection, loadDocument } from './shared'
import * as colorette from 'colorette'

const amqpChannel: amqp.Channel = await createAmqpConnection()

try {
  console.log('Started extracting links')
  await extractLinks(1, 50)
} catch (e) {
  console.error(e)
} finally {
  await amqpChannel.close()
}

async function extractLinks(
  pageIndex: number,
  maxPageIndex: number,
): Promise<null> {
  const document = await loadDocument('https://999.md/ro/list/transport/cars?page=' + pageIndex)

  const anchors = document.querySelectorAll<HTMLAnchorElement>(
    '.ads-list-photo .ads-list-photo-item a.js-item-ad',
  )

  const linksBatch: Set<string> = new Set<string>()

  for (const anchor of anchors) {
    const { href } = anchor

    if (href.startsWith('/booster/')) {
      continue
    }

    linksBatch.add(href)
  }

  console.log(`Sent ${colorette.greenBright(linksBatch.size)} links`)

  amqpChannel.sendToQueue(
    appAmqpOptions.queue,
    Buffer.from(JSON.stringify(Array.from(linksBatch))),
  )

  const paginator = document.querySelector('.paginator')

  const hasNext =
    paginator &&
    !paginator.querySelector('li:last-child').classList.contains('current')

  if (!hasNext) {
    console.log(`No more pages left at ${pageIndex}`)
  }

  return hasNext && pageIndex <= maxPageIndex
    ? extractLinks(pageIndex + 1, maxPageIndex)
    : null
}

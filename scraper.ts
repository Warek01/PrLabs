import { createConnection, Socket } from 'net'
import puppeteer from 'puppeteer'
import { writeFileSync } from 'fs'

import type { Product } from './types.ts'

// Which pages are being requested
enum Stage {
  Products,
  Product,
  Other
}

enum Page {
  Home,
  About
}

let parsingStage: Stage = Stage.Products
let productsLinks: string[] = []
const products: Product[] = []
let currentPage: Page = Page.Home

// Browser instance for scraping
const browser = await puppeteer.launch({
  channel: 'chrome',
  headless: 'new'
})
const page = await browser.newPage()

// TCP socket
const client: Socket = createConnection({
  port: 3000,
})

client
  .on('connect', () => {
    console.log('Connection established')
    client.write('GET /products HTTP/1.1')
  })
  .on('data', async (buffer: Buffer) => {
    const text = buffer.toString('utf-8')
    const html = text.match(/<!DOCTYPE(.|\n)*/)![0]!
    switch (parsingStage) {
      case Stage.Products:
        console.log('Scraping products')
        await scrapProducts(html)
        parsingStage = Stage.Product
        console.log('Requesting product 0')
        client.write('GET /product/0 HTTP/1.1')
        break
      case Stage.Product:
        console.log(`Scraping product ${products.length}`)
        await scrapProduct(html)
        if (products.length < productsLinks.length) {
          console.log(`Getting /product/${products.length}`)
          client.write(`GET /product/${products.length} HTTP/1.1`)
        } else {
          writeFileSync('generated/products.json', JSON.stringify(products, null, 2))
          parsingStage = Stage.Other
          client.write('GET / HTTP/1.1')
        }
        break

      case Stage.Other:
        switch (currentPage) {
          case Page.Home:
            console.log('Getting Home')
            writeFileSync('generated/home.html', html)
            currentPage = Page.About
            client.write('GET /about HTTP/1.1')
            break
          case Page.About:
            console.log('Getting About')
            writeFileSync('generated/about.html', html)
            currentPage = Page.About
            client.end()
            break
        }
        break
    }
  })
  .once('error', (err) => console.log('Error', err))
  .once('ready', () => console.log('Connection ready'))
  .once('end', () => console.log('Connection ended'))
  .once('timeout', () => console.log('Connection timeout'))

// Scraping functions
async function scrapProducts(html: string) {
  await page.setContent(html)
  await page.screenshot({ path: 'generated/products.png' })

  productsLinks = await page.$$eval(
    'a',
    anchors => anchors.map(
      anchor => anchor.getAttribute('href')
    )
  )

  writeFileSync('generated/product-links.json', JSON.stringify(productsLinks, null, 2))
  console.log('Generated product-links.json')
}

async function scrapProduct(html: string) {
  await page.setContent(html)
  await page.screenshot({ path: 'generated/product.png' })

  const product: Partial<Product> = {}

  product.name = await page.$eval('.name', element =>
    element.textContent.split(':')[1].trim()
  )

  product.price = await page.$eval('.price', element =>
    parseInt(element.textContent.split(':')[1].trim())
  )

  product.owner = await page.$eval('.owner', element =>
    element.textContent.split(':')[1].trim()
  )

  product.date = await page.$eval('.date', element =>
    element.textContent.split(':')[1].trim()
  )

  console.log(product)
  products.push(product as Product)
}

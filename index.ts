import { Socket, createServer, Server } from 'net'
import { readFile } from 'fs/promises'

import type { Product } from './types.ts'

const products: Product[] = [
  {
    name: 'Prod 1',
    price: 2000,
    owner: 'warek',
    date: new Date(2020, 10, 13)
  },
  {
    name: 'Prod 2',
    price: 550,
    owner: 'Mihai',
    date: new Date(2019, 1, 30)
  },
  {
    name: 'Prod 3',
    price: 3550,
    owner: 'Alex',
    date: new Date(2023, 11, 20)
  },
  {
    name: 'Prod 4',
    price: 120,
    owner: 'Someone',
    date: new Date(1999, 0, 1)
  },
]

const server: Server = createServer((socket: Socket) => {
  socket
    .on('data', handleRequest(socket))
    .once('end', () => socket.end())
    .once('close', () => socket.end())
})

server
  .listen(3000)
  .once('close', () => console.log('Connection closed'))
  .once('drop', () => console.log('Connection dropped'))
  .once('error', (err) => console.log('Error: ', err))
  .once('listening', () => console.log('Listening'))

function handleRequest(socket: Socket) {
  return async (data: Buffer) => {
    const text = data.toString('utf8')
    const indexOfNewline = text.indexOf('\n')
    const firstLine = indexOfNewline !== -1 ? text.substring(0, indexOfNewline) : text
    const [method, path, httpVersion] = firstLine.split(' ')

    console.log(method, path, httpVersion)

    if (path.startsWith('/product/')) {
      const match = path.match(/(?<=product\/)[0-9]+/)

      if (!match) {
        return notFound(socket)
      }

      const index = parseInt(match![0])

      if (index >= products.length) {
        return notFound(socket)
      }

      const product = products[index]
      let html: string = await readFile('product.html', { encoding: 'utf8' })
      html = html
        .replaceAll('%name', product.name.toString())
        .replaceAll('%price', product.price.toString())
        .replaceAll('%owner', product.owner.toString())
        .replaceAll('%date', product.date.toDateString())

      socket.write(httpResponse(html))
    } else if (path === '/products') {
      let html: string = await readFile('products.html', { encoding: 'utf8' })
      html = html
        .replaceAll(
          '%products',
          products.map((product, index) => `
            <a class="product" href="/product/${index}">
              <h3>${product.name}</h3>
            </a>
        `).join('')
        )

      socket.write(httpResponse(html))

    } else {
      let fileName: string

      switch (path) {
        case '/':
          fileName = 'home.html'
          break
        case '/about':
          fileName = 'about.html'
          break
        default:
          return notFound(socket)
      }

      let html: string = await readFile(fileName, { encoding: 'utf8' })
      socket.write(httpResponse(html))
    }

    // socket.end()
  }
}

function httpResponse(text: string) {
  const firstLine = 'HTTP/1.1 200 OK'
  const headers = {
    Date: new Date().toString(),
    Server: 'local-sever',
    'Content-Type': 'text/html',
    'Content-Length': text.length
  }

  return [
    firstLine,
    Object.entries(headers).map(([key, value]) => `${key}: ${value}`),
    '\n',
    text
  ].join('\n')
}

function notFound(socket: Socket) {
  socket.write(httpResponse('<h1>Not Found</h1>'))
  socket.end()
}

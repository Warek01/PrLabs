import * as colorette from 'colorette'
import http from 'http'

import { dataSource } from './server/models/data-source'
import { SmtpServer } from './server/models/smtp-server'

async function main() {
  await dataSource.initialize()

  const smtpServer = new SmtpServer(3011, dataSource)

  const httpServer = http.createServer(async (req, res) => {
    const { url } = req

    console.log(`Received request on ${colorette.greenBright(url)}`)

    switch (url) {
      case '/send':
        break
      case '/get':
        break
    }
  })

  httpServer.listen(3010)

  process.on('SIGINT', terminate)

  function terminate() {
    console.log(colorette.bgBlue(colorette.greenBright(' Terminating ')))
    httpServer.close()
    dataSource.destroy()
  }
}

import net from 'net'

import { SmtpClient } from './smtp-client/SmtpClient'
import { Logger } from './Logger'

export class SmtpServer {
  private readonly _clients: SmtpClient[]
  private readonly _server: net.Server

  constructor(port: number) {
    const logger = new Logger(SmtpServer.name)

    const server = net.createServer((socket) => {
      const client = new SmtpClient(socket, this._clients)
      this._clients.push(client)
      logger.log(`New client registered`)
    })

    server.listen(port, '127.0.0.1', 5, () => {
      const address = server.address() as net.SocketAddress
      logger.log(`Server listening on ${address.address}:${address.port}`)
    })

    this._clients = []
    this._server = server

    process
      .addListener('SIGINT', this.close.bind(this))
      .addListener('SIGQUIT', this.close.bind(this))
      .addListener('exit', this.close.bind(this))
  }

  public close(): void {
    this._server?.close()
  }
}

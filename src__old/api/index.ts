import express from 'express'
import bodyParser from 'body-parser'
import net from 'net'

const clientSocket = net.createConnection(
  {
    port: 3011,
    host: 'localhost',
  },
  () => {
    clientSocket.write('HELO test@test.com')

    clientSocket.on('data', (buffer) => {
      const data = buffer.toString('utf8')
      console.log(data)
    })
    // const app = express()
    //
    // app.use(bodyParser.json())
    //
    // app.get('/', (req, res) => {})
    //
    // app.listen(3010, () => console.log('Listening'))
  },
)

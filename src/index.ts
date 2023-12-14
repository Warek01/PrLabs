import FtpClient from 'ftp'
import express from 'express'
import nodemailer from 'nodemailer'
import path from 'path'
import multer from 'multer'
import 'dotenv/config.js'

import { Logger } from './logger'
import { Email } from './types'

main()

async function main() {
  const port = parseInt(process.env.NODE_PORT)

  const ftpLogger = new Logger('FTP')
  const ftpClient = new FtpClient()

  ftpClient.connect({
    host: process.env.FTP_IP,
    port: parseInt(process.env.FTP_PORT),
    secure: false,
    user: process.env.FTP_USERNAME,
    password: process.env.FTP_PASSWORD,
  })

  ftpClient
    .on('ready', () => ftpLogger.log('Connection established'))
    .on('error', (err) => ftpLogger.error(err))

  const smtpLogger = new Logger('SMTP')
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL,
      pass: process.env.GOOGLE_APP_KEY,
    },
  })

  const httpLogger = new Logger('HTTP')
  const app = express()
  const upload = multer()

  app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'))
  })

  app.post('/', upload.any(), async (req, res) => {
    httpLogger.log('POST', req.body)
    let { to, subject, text } = req.body as Email
    const file = (req.files as Express.Multer.File[]).at(0)

    if (file) {
      text += `\r\n\r\nftp://yourusername@138.68.98.108/home/somedirectory/faf-212/alex-dobrojan/${encodeURI(
        file.originalname,
      )}`

      ftpClient.put(
        file.buffer,
        `faf-212/alex-dobrojan/${file.originalname}`,
        false,
        (err) => {
          if (err) ftpLogger.error(err)
          else ftpLogger.log(`${file.originalname} sent successfully`)
        },
      )
    }

    try {
      await transporter.sendMail({
        from: process.env.GMAIL,
        to,
        subject,
        text,
      })

      res.send('success')
    } catch (err) {
      smtpLogger.error(err)
      res.send('error')
    }

    res.end()
  })

  app.listen(port, () => httpLogger.log(`Listening on port ${port}`))
}

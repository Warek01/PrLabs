import { DataSource } from 'typeorm'

import { Email } from './core/models/Email'

let dataSource: DataSource

export async function getEmailRepo() {
  if (!dataSource) {
    dataSource = new DataSource({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      synchronize: true,
      cache: false,
      username: 'warek',
      password: 'warek',
      database: 'pr_email_db',
    })

    await dataSource.initialize()
  }

  return dataSource.getRepository(Email)
}


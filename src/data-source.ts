import { DataSource } from 'typeorm'

import { ElectroScooter } from './entities/electro-scooter.entity'

export const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'warek',
  password: 'warek',
  schema: 'public',
  synchronize: true,
  database: 'electro_scooter',
  entities: [ElectroScooter],
  migrationsRun: false,
})

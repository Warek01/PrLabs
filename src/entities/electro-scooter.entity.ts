import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('electro_scooter')
export class ElectroScooter {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Column({ type: 'varchar', length: 100 })
  name: string

  @Column({ type: 'double precision', name: 'battery_level' })
  batteryLevel: number
}

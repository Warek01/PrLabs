import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('batches')
export class Batch {
  @PrimaryGeneratedColumn('increment')
  readonly id: number

  @Column({ type: 'text', array: true })
  links: string[]
}

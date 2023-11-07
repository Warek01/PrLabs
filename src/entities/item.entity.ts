import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('items')
export class Item {
  @PrimaryColumn({ type: 'text' })
  url: string

  @Column({ type: 'text', nullable: true })
  title?: string

  @Column({ type: 'text', nullable: true })
  description?: string

  @Column({ type: 'int', nullable: true })
  views?: number

  @Column({ type: 'text', nullable: true })
  type?: string

  @Column({ type: 'date', nullable: true })
  date?: Date

  @Column({ type: 'text', nullable: true })
  phone?: string

  @Column({ type: 'text', array: true, nullable: true })
  categories?: string[]

  @Column({ type: 'text', array: true, nullable: true })
  photos?: string[]

  @Column({ type: 'text', nullable: true })
  region?: string

  @Column({ type: 'jsonb', nullable: true })
  prices?: {
    euros?: number
    dollars?: number
    lei?: number
  }

  @Column({ type: 'jsonb', nullable: true })
  features?: Record<string, string>

  @Column({ type: 'text', array: true, name: 'other_features', nullable: true })
  otherFeatures?: string[]

  @Column({ type: 'jsonb', nullable: true })
  owner?: {
    name?: string
    url?: string
  }
}

import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('emails')
export class Email {
  @PrimaryGeneratedColumn('identity')
  id: number

  @Column({ type: 'varchar' })
  from: string

  @Column({ type: 'varchar' })
  to: string

  @Column({ type: 'varchar' })
  data: string

  @Column({ type: 'timestamp', name: 'sent_at' })
  sentAt: Date
}

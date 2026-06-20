import { IsUUID } from 'class-validator'

export class ValidateTicketDto {
  @IsUUID()
  ticketId!: string

  @IsUUID()
  eventId!: string
}

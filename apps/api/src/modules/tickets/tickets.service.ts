import { Injectable, NotFoundException } from '@nestjs/common'
import { TicketsRepository } from './tickets.repository'
import type { ValidateTicketDto } from './dto/validate-ticket.dto'

@Injectable()
export class TicketsService {
  constructor(private readonly ticketsRepository: TicketsRepository) {}

  async findById(id: string) {
    const ticket = await this.ticketsRepository.findById(id)
    if (!ticket) {
      throw new NotFoundException(`Ingresso '${id}' não encontrado`)
    }
    return ticket
  }

  validate(dto: ValidateTicketDto) {
    return this.ticketsRepository.validate(dto)
  }
}

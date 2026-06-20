import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { TicketsService } from './tickets.service'
import { ValidateTicketDto } from './dto/validate-ticket.dto'

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.ticketsService.findById(id)
  }

  @Post('validate')
  validate(@Body() dto: ValidateTicketDto) {
    return this.ticketsService.validate(dto)
  }
}

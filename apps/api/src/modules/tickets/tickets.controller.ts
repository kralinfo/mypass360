import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { TicketsService } from './tickets.service'
import { ValidateTicketDto } from './dto/validate-ticket.dto'
import { AuthGuard } from '@/common/guards/auth.guard'
import { CurrentUser } from '@/common/decorators/current-user.decorator'
import type { AuthenticatedUser } from '@/common/guards/auth.guard'

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  /**
   * Retorna todos os tickets do usuário autenticado.
   * Rota protegida — somente o próprio usuário acessa seus tickets.
   */
  @Get('my')
  @UseGuards(AuthGuard)
  findMyTickets(@CurrentUser() user: AuthenticatedUser) {
    return this.ticketsService.findMyTickets(user.id)
  }

  /**
   * Retorna os detalhes de um ticket específico.
   * Verifica que o ticket pertence ao usuário autenticado.
   */
  @Get(':id')
  @UseGuards(AuthGuard)
  findById(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ticketsService.findMyTicketById(id, user.id)
  }

  /**
   * Valida um ticket no check-in (futuramente para app de validação presencial).
   */
  @Post('validate')
  validate(@Body() dto: ValidateTicketDto) {
    return this.ticketsService.validate(dto)
  }
}

import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { TicketsRepository, type OrderItemForTicketGeneration } from './tickets.repository'
import type { ValidateTicketDto } from './dto/validate-ticket.dto'

@Injectable()
export class TicketsService {
  constructor(private readonly ticketsRepository: TicketsRepository) {}

  /**
   * Retorna o ticket pelo ID.
   * Lança NotFoundException se não existir.
   */
  async findById(id: string) {
    const ticket = await this.ticketsRepository.findById(id)
    if (!ticket) {
      throw new NotFoundException(`Ingresso '${id}' não encontrado`)
    }
    return ticket
  }

  /**
   * Retorna todos os tickets do usuário autenticado.
   * A validação de ownership é feita no repository (filtro por user_id no banco).
   */
  async findMyTickets(userId: string) {
    return this.ticketsRepository.findByUserId(userId)
  }

  /**
   * Retorna um ticket específico apenas se pertencer ao usuário.
   * Lança NotFoundException se não encontrar ou não for o dono.
   */
  async findMyTicketById(id: string, userId: string) {
    const ticket = await this.ticketsRepository.findByIdAndUser(id, userId)
    if (!ticket) {
      throw new NotFoundException(`Ingresso '${id}' não encontrado`)
    }
    return ticket
  }

  /**
   * Gera tickets para todos os itens de um pedido pago.
   * Um ticket é criado para cada unidade de cada order_item.
   *
   * Chamado automaticamente após confirmação de pagamento.
   */
  async generateForOrder(
    orderId: string,
    userId: string,
    userEmail: string,
    orderItems: OrderItemForTicketGeneration[],
    eventId?: string
  ) {
    return this.ticketsRepository.generateForOrder(orderId, userId, userEmail, orderItems, eventId)
  }

  validate(dto: ValidateTicketDto) {
    return this.ticketsRepository.validate(dto)
  }
}

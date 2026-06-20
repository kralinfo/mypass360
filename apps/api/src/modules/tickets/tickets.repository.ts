import { Injectable } from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'
import type { ValidateTicketDto } from './dto/validate-ticket.dto'

@Injectable()
export class TicketsRepository {
  private readonly table = 'tickets'

  constructor(private readonly supabase: SupabaseService) {}

  async findById(id: string) {
    const { data, error } = await this.supabase.getClient().from(this.table).select('*').eq('id', id).single()

    if (error) {
      return null
    }

    return data
  }

  async validate(dto: ValidateTicketDto) {
    const ticket = await this.findById(dto.ticketId)

    if (!ticket) {
      return { valid: false, reason: 'Ingresso não encontrado' }
    }

    if (ticket.event_id !== dto.eventId) {
      return { valid: false, reason: 'Ingresso não pertence ao evento' }
    }

    if (ticket.status !== 'active') {
      return { valid: false, reason: 'Ingresso já utilizado ou inválido' }
    }

    const { error } = await this.supabase
      .getClient()
      .from(this.table)
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('id', ticket.id)

    if (error) {
      throw new Error(error.message)
    }

    return { valid: true, ticketId: ticket.id }
  }
}

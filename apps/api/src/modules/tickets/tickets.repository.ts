import { Injectable } from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'
import type { ValidateTicketDto } from './dto/validate-ticket.dto'
import { randomUUID } from 'crypto'
import * as QRCode from 'qrcode'

export interface OrderItemForTicketGeneration {
  id: string
  ticketTypeId: string
  quantity: number
  unitPrice: number
  ticketTypeName?: string
  ticketTypeDescription?: string
  nomineeNames?: string[]
  nomineeCpfs?: string[]
}

@Injectable()
export class TicketsRepository {
  private readonly table = 'tickets'

  constructor(private readonly supabase: SupabaseService) {}

  async findById(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single()

    if (error) return null
    return data
  }

  /**
   * Retorna todos os tickets do usuário autenticado.
   * Enriquece com dados de evento e tipo de ingresso via queries separadas.
   * NUNCA retorna tickets de outros usuários.
   */
  async findByUserId(userId: string) {
    const { data: tickets, error } = await this.supabase
      .getClient()
      .from(this.table)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Erro ao buscar ingressos: ${error.message}`)
    }

    if (!tickets || tickets.length === 0) return []

    // Buscar orders para resolver event_id quando ticket.event_id é nulo
    const orderIds = [...new Set(tickets.map((t: any) => t.order_id).filter(Boolean))]
    
    let ordersResult = { data: [] as any[], error: null as any }
    if (orderIds.length > 0) {
      const res = await this.supabase.getClient().from('orders').select('id, event_id').in('id', orderIds)
      ordersResult.data = res.data ?? []
      ordersResult.error = res.error
    }

    const orderEventMap = new Map((ordersResult.data ?? []).map((o: any) => [o.id, o.event_id]))

    // IDs únicos de evento (de tickets + de orders como fallback)
    const eventIds = [...new Set([
      ...tickets.map((t: any) => t.event_id).filter(Boolean),
      ...(ordersResult.data ?? []).map((o: any) => o.event_id).filter(Boolean),
    ])]

    const ticketTypeIds = [...new Set(tickets.map((t: any) => t.ticket_type_id).filter(Boolean))]

    const [eventsResult, ticketTypesResult] = await Promise.all([
      eventIds.length > 0
        ? this.supabase.getClient().from('events').select('id, title, date, location, slug, ticket_layout, participant_id_type').in('id', eventIds)
        : Promise.resolve({ data: [], error: null as any }),
      ticketTypeIds.length > 0
        ? this.supabase.getClient().from('ticket_types').select('id, name, price, description').in('id', ticketTypeIds)
        : Promise.resolve({ data: [], error: null as any }),
    ])

    const eventsMap = new Map((eventsResult.data ?? []).map((e: any) => [e.id, e]))
    const ticketTypesMap = new Map((ticketTypesResult.data ?? []).map((tt: any) => [tt.id, tt]))

    const mappedTickets = tickets.map((ticket: any) => {
      const effectiveEventId = ticket.event_id ?? orderEventMap.get(ticket.order_id)
      const resolvedEvent = eventsMap.get(effectiveEventId) ?? null
      return {
        ...ticket,
        event: resolvedEvent,
        ticketType: ticketTypesMap.get(ticket.ticket_type_id) ?? null,
      }
    })

    return mappedTickets
  }


  /**
   * Busca ticket por ID validando que pertence ao usuário.
   * Retorna null se não encontrar ou usuário não for o dono.
   */
  async findByIdAndUser(id: string, userId: string) {
    const { data: ticket, error } = await this.supabase
      .getClient()
      .from(this.table)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error || !ticket) return null

    const [eventResult, ticketTypeResult] = await Promise.all([
      ticket.event_id
        ? this.supabase.getClient().from('events').select('id, title, date, location, slug').eq('id', ticket.event_id).single()
        : Promise.resolve({ data: null, error: null }),
      ticket.ticket_type_id
        ? this.supabase.getClient().from('ticket_types').select('id, name, price, description').eq('id', ticket.ticket_type_id).single()
        : Promise.resolve({ data: null, error: null }),
    ])

    return {
      ...ticket,
      event: eventResult.data ?? null,
      ticketType: ticketTypeResult.data ?? null,
    }
  }

  async findByOrder(orderId: string) {
    const { data: tickets, error } = await this.supabase
      .getClient()
      .from(this.table)
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Erro ao buscar ingressos pelo pedido: ${error.message}`)
    }

    if (!tickets || tickets.length === 0) {
      return []
    }

    const eventIds = [...new Set(tickets.map((t: any) => t.event_id).filter(Boolean))]
    const ticketTypeIds = [...new Set(tickets.map((t: any) => t.ticket_type_id).filter(Boolean))]

    const [eventsResult, ticketTypesResult] = await Promise.all([
      eventIds.length > 0
        ? this.supabase.getClient().from('events').select('id, title, ticket_layout, participant_id_type').in('id', eventIds)
        : Promise.resolve({ data: [], error: null as any }),
      ticketTypeIds.length > 0
        ? this.supabase.getClient().from('ticket_types').select('id, name, price, description').in('id', ticketTypeIds)
        : Promise.resolve({ data: [], error: null as any }),
    ])

    const eventsMap = new Map((eventsResult.data ?? []).map((e: any) => [e.id, e]))
    const ticketTypesMap = new Map((ticketTypesResult.data ?? []).map((tt: any) => [tt.id, tt]))

    return tickets.map((ticket: any) => ({
      ...ticket,
      event: eventsMap.get(ticket.event_id) ?? null,
      ticketType: ticketTypesMap.get(ticket.ticket_type_id) ?? null,
    }))
  }

  /**
   * Gera um ticket para cada unidade adquirida em um pedido.
   * Requer que a migration 20260723000000_tickets_definitive_architecture.sql
   * tenha sido executada (campos: public_code, buyer_email, issued_at).
   */
  async generateForOrder(
    orderId: string,
    userId: string,
    userEmail: string,
    orderItems: OrderItemForTicketGeneration[],
    eventId?: string,
    buyerDisplayName?: string
  ) {
    const ticketsToInsert = []

    // Buscar participant_id_type UMA vez antes do loop (evita N queries desnecessárias)
    let pIdType = 'name'
    if (eventId) {
      const { data: eventData } = await this.supabase
        .getClient()
        .from('events')
        .select('participant_id_type')
        .eq('id', eventId)
        .single()
      if (eventData) {
        pIdType = eventData.participant_id_type
      }
    }

    for (const item of orderItems) {
      for (let i = 0; i < item.quantity; i++) {
        const ticketId = randomUUID()
        const publicCode = this.generatePublicCode()

        // QR Code contém apenas o UUID — nunca dados sensíveis
        const qrCodeDataUrl = await QRCode.toDataURL(ticketId, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 300,
        })

        // Definir o nome do portador com base na regra do evento
        let nomineeName: string | null = null

        if (pIdType === 'none') {
          // Evento sem nome (transferível) — não grava nome
          nomineeName = null
        } else {
          nomineeName = item.nomineeNames?.[i]?.trim() || buyerDisplayName || null
        }

        const nomineeCpf = item.nomineeCpfs?.[i] || null

        ticketsToInsert.push({
          id: ticketId,
          public_code: publicCode,
          order_id: orderId,
          order_item_id: item.id,
          ticket_type_id: item.ticketTypeId,
          user_id: userId,
          buyer_name: nomineeName,
          buyer_email: userEmail,
          buyer_cpf: nomineeCpf,
          event_id: eventId ?? null,
          qr_code: qrCodeDataUrl,
          status: 'VALID',
          issued_at: new Date().toISOString(),
        })
      }
    }

    if (ticketsToInsert.length === 0) return []

    // Tentar inserir com todos os campos (requer migration aplicada)
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .insert(ticketsToInsert)
      .select('*')

    if (error) {
      // Se falhou por coluna não existente (migration não aplicada),
      // tenta novamente com apenas os campos do schema original
      const isColumnError = error.message.includes('column') || error.message.includes('violates')
      if (isColumnError) {
        console.warn('[TicketsRepository] Migration não aplicada — usando insert minimal:', error.message)

        const minimalTickets = ticketsToInsert.map((t) => ({
          id: t.id,
          order_id: t.order_id,
          ticket_type_id: t.ticket_type_id,
          user_id: t.user_id,
          event_id: t.event_id,
          qr_code: t.qr_code,
          status: 'active', // valor aceito pelo schema original
        }))

        const { data: fallbackData, error: fallbackError } = await this.supabase
          .getClient()
          .from(this.table)
          .insert(minimalTickets)
          .select('*')

        if (fallbackError) {
          throw new Error(`Falha ao gerar tickets (fallback): ${fallbackError.message}`)
        }

        console.warn('[TicketsRepository] IMPORTANTE: Execute a migration SQL para habilitar todos os campos de tickets.')
        return fallbackData ?? []
      }

      throw new Error(`Falha ao gerar tickets: ${error.message}`)
    }

    return data ?? []
  }

  /**
   * Gera código público amigável: MP360-XXXXXXXX
   */
  private generatePublicCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = 'MP360-'
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  async validate(dto: ValidateTicketDto) {
    const ticket = await this.findById(dto.ticketId)

    if (!ticket) return { valid: false, reason: 'Ingresso não encontrado' }
    if (ticket.event_id !== dto.eventId) return { valid: false, reason: 'Ingresso não pertence ao evento' }
    if (ticket.status !== 'VALID' && ticket.status !== 'active') {
      return { valid: false, reason: 'Ingresso já utilizado ou inválido' }
    }

    const newStatus = ticket.status === 'VALID' ? 'CHECKED_IN' : 'used'
    const checkinTime = new Date().toISOString()
    const { error } = await this.supabase
      .getClient()
      .from(this.table)
      .update({ status: newStatus, checked_in_at: checkinTime })
      .eq('id', ticket.id)

    if (error) throw new Error(error.message)

    try {
      await this.supabase.getClient().from('checkins').insert({
        event_id: ticket.event_id,
        ticket_id: ticket.id,
        checked_in_at: checkinTime,
      })
    } catch {
      // Ignora erro se já inserido ou tabela não disponível
    }

    return { valid: true, ticketId: ticket.id }

  }

  /**
   * Atualiza o nome do portador do ingresso.
   * Só permitido para ingressos do modelo Ticket (sem CPF).
   * Valida ownership pelo user_id.
   */
  async updateBuyerName(ticketId: string, userId: string, newName: string): Promise<{ success: boolean }> {
    // Buscar o ticket e validar ownership
    const { data: ticket, error: fetchErr } = await this.supabase
      .getClient()
      .from(this.table)
      .select('id, user_id, event_id')
      .eq('id', ticketId)
      .eq('user_id', userId)
      .single()

    if (fetchErr || !ticket) {
      throw new Error('Ingresso não encontrado ou sem permissão.')
    }

    // Buscar o evento para verificar se é formal_pdf (não permitido editar nome nesse caso)
    if (ticket.event_id) {
      const { data: event } = await this.supabase
        .getClient()
        .from('events')
        .select('ticket_layout')
        .eq('id', ticket.event_id)
        .single()

      if (event?.ticket_layout === 'formal_pdf') {
        throw new Error('Não é possível editar o nome em ingressos do modelo PDF Formal.')
      }
    }

    const { error: updateErr } = await this.supabase
      .getClient()
      .from(this.table)
      .update({ buyer_name: newName.trim() || null })
      .eq('id', ticketId)
      .eq('user_id', userId)

    if (updateErr) throw new Error(updateErr.message)

    return { success: true }
  }
}

import { Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'
import type {
  CheckinAccess,
  CheckinAuthResponse,
  CheckinRecord,
  CheckinValidationResult,
} from '@mypass360/types'

@Injectable()
export class CheckinRepository {
  private readonly logger = new Logger(CheckinRepository.name)

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Busca e autentica um acesso de portaria pelo código único.
   * Atualiza last_used_at do acesso.
   */
  async findAccessByCode(code: string): Promise<CheckinAuthResponse | null> {
    const client = this.supabase.getClient()
    const trimmedCode = code.trim().toUpperCase()

    // 1. Buscar a credencial de acesso
    const { data: access, error: accessErr } = await client
      .from('checkin_accesses')
      .select('*')
      .eq('code', trimmedCode)
      .eq('is_active', true)
      .maybeSingle()

    if (accessErr || !access) {
      return null
    }

    // 2. Atualizar last_used_at de forma assíncrona
    await client
      .from('checkin_accesses')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', access.id)

    // 3. Buscar os detalhes do evento vinculado
    const { data: event, error: eventErr } = await client
      .from('events')
      .select('id, title, slug, date, location, ticket_layout, participant_id_type, checkin_enabled')
      .eq('id', access.event_id)
      .single()

    if (eventErr || !event) {
      return null
    }

    // 4. Contabilizar total de ingressos emitidos e check-ins realizados
    const { count: totalTickets } = await client
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id)

    const { count: checkedInTickets } = await client
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .in('status', ['CHECKED_IN', 'used'])

    return {
      access: {
        id: access.id,
        eventId: access.event_id,
        name: access.name,
        code: access.code,
        isActive: access.is_active,
        createdAt: access.created_at,
        lastUsedAt: access.last_used_at,
      },
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        date: event.date,
        location: event.location,
        ticketLayout: event.ticket_layout ?? 'ticket',
        participantIdType: event.participant_id_type ?? 'name',
        checkinEnabled: event.checkin_enabled !== false,
        totalTickets: totalTickets ?? 0,
        checkedInTickets: checkedInTickets ?? 0,
      },
    }
  }

  /**
   * Realiza a validação atômica do ingresso e persiste o registro de Check-in.
   * Garante idempotência e concorrência no nível do banco.
   */
  async validateTicket(ticketIdOrCode: string, accessCode: string): Promise<CheckinValidationResult> {
    const client = this.supabase.getClient()

    // 1. Validar e obter a credencial do operador
    const authData = await this.findAccessByCode(accessCode)
    if (!authData) {
      return { valid: false, reason: 'Credencial de check-in inválida ou desativada.' }
    }

    const { access, event } = authData

    // 1.1 Validar se o check-in do evento está ativo
    if (event.checkinEnabled === false) {
      return {
        valid: false,
        reason: 'O check-in para este evento está desativado pelo organizador.',
      }
    }

    const cleanedInput = ticketIdOrCode.trim()


    // 2. Buscar o ticket pelo UUID ou pelo public_code (MP360-XXXXXXXX)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanedInput)
    const query = client
      .from('tickets')
      .select(`
        id,
        public_code,
        event_id,
        status,
        buyer_name,
        buyer_cpf,
        buyer_email,
        checked_in_at,
        checked_in_by,
        ticket_type_id,
        ticket_types (
          name
        )
      `)

    const { data: ticket, error: ticketErr } = isUuid
      ? await query.eq('id', cleanedInput).maybeSingle()
      : await query.eq('public_code', cleanedInput.toUpperCase()).maybeSingle()

    if (ticketErr || !ticket) {
      return { valid: false, reason: 'Ingresso não encontrado.' }
    }

    // 3. Validar se o ticket pertence ao evento correto
    if (ticket.event_id !== event.id) {
      return {
        valid: false,
        reason: 'Este ingresso pertence a outro evento.',
        ticketId: ticket.id,
        publicCode: ticket.public_code,
      }
    }

    // 4. Validar se já realizou check-in (proteção contra duplo uso)
    const isAlreadyCheckedIn = ticket.status === 'CHECKED_IN' || ticket.status === 'used'
    if (isAlreadyCheckedIn) {
      return {
        valid: false,
        reason: 'Este ingresso já realizou check-in.',
        ticketId: ticket.id,
        publicCode: ticket.public_code,
        firstCheckedInAt: ticket.checked_in_at ?? undefined,
        firstCheckedInBy: ticket.checked_in_by ?? undefined,
      }
    }

    // 5. Validar se está ativo / válido para entrada
    const isValidStatus = ticket.status === 'VALID' || ticket.status === 'active'
    if (!isValidStatus) {
      return {
        valid: false,
        reason: 'Este ingresso está cancelado ou inválido.',
        ticketId: ticket.id,
        publicCode: ticket.public_code,
      }
    }

    const checkinTime = new Date().toISOString()
    const ticketTypeName = (ticket.ticket_types as any)?.name ?? 'Ingresso'

    // 6. Atualização atômica do status do ticket (evita race conditions)
    const { data: updatedTicket, error: updateErr } = await client
      .from('tickets')
      .update({
        status: 'CHECKED_IN',
        checked_in_at: checkinTime,
        checked_in_by: access.name,
      })
      .eq('id', ticket.id)
      .in('status', ['VALID', 'active']) // Garante concorrência atômica
      .select('id')
      .maybeSingle()

    if (updateErr || !updatedTicket) {
      // Se nenhuma linha foi afetada, outro processo validou simultaneamente
      return {
        valid: false,
        reason: 'Este ingresso já realizou check-in.',
        ticketId: ticket.id,
        publicCode: ticket.public_code,
      }
    }

    // 7. Persistir o registro na tabela de auditoria checkins
    try {
      await client.from('checkins').insert({
        event_id: event.id,
        ticket_id: ticket.id,
        checkin_access_id: access.id,
        checked_in_at: checkinTime,
      })
    } catch (insertErr) {
      this.logger.warn(`Erro ao registrar histórico de checkin para ticket ${ticket.id}:`, insertErr)
    }

    // 8. Aplicar regras de privacidade na resposta
    const isAnonymous = event.ticketLayout !== 'formal_pdf' && event.participantIdType === 'none'
    const participantName = isAnonymous ? null : ticket.buyer_name ?? ticket.buyer_email ?? null
    const participantCpf = isAnonymous ? null : ticket.buyer_cpf ?? null

    return {
      valid: true,
      ticketId: ticket.id,
      publicCode: ticket.public_code,
      ticketTypeName,
      participantName,
      participantCpf,
      checkedInAt: checkinTime,
      event: {
        id: event.id,
        title: event.title,
        ticketLayout: event.ticketLayout,
        participantIdType: event.participantIdType,
      },
    }
  }

  /**
   * Retorna os check-ins mais recentes para o evento autenticado.
   */
  async getRecentCheckins(accessCode: string, limit = 10): Promise<CheckinRecord[]> {
    const client = this.supabase.getClient()
    const authData = await this.findAccessByCode(accessCode)
    if (!authData) return []

    const { event } = authData
    const isAnonymous = event.ticketLayout !== 'formal_pdf' && event.participantIdType === 'none'

    const { data: records, error } = await client
      .from('checkins')
      .select(`
        id,
        event_id,
        ticket_id,
        checked_in_at,
        checkin_accesses (
          name
        ),
        tickets (
          public_code,
          buyer_name,
          buyer_cpf,
          buyer_email,
          ticket_types (
            name
          )
        )
      `)
      .eq('event_id', event.id)
      .order('checked_in_at', { ascending: false })
      .limit(limit)

    if (error || !records) return []

    return records.map((r: any) => ({
      id: r.id,
      eventId: r.event_id,
      ticketId: r.ticket_id,
      publicCode: r.tickets?.public_code ?? '',
      ticketTypeName: r.tickets?.ticket_types?.name ?? 'Ingresso',
      participantName: isAnonymous ? null : r.tickets?.buyer_name ?? r.tickets?.buyer_email ?? null,
      participantCpf: isAnonymous ? null : r.tickets?.buyer_cpf ?? null,
      checkedInAt: r.checked_in_at,
      operatorName: r.checkin_accesses?.name ?? null,
      status: 'CHECKED_IN' as const,
    }))
  }
}

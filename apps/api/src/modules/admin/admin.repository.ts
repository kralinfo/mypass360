import { Injectable } from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'
import type { AdminDashboardData, AdminEventItem, AdminUserItem } from '@mypass360/types'
import { MailService } from '@/common/mail/mail.service'

export interface AdminAttendee {
  ticketId: string
  publicCode: string
  name: string | null
  cpf: string | null
  email: string | null
  ticketTypeName: string
  status: string
  issuedAt: string | null
}

type EventRow = {
  id: string
  title: string
  slug: string
  date: string
  location: string
  status: 'draft' | 'published' | 'cancelled' | 'finished'
  organizer_id: string
  capacity: number
  price: number
  created_at: string
}

type OrderRow = {
  id: string
  event_id: string
  user_id: string | null
  status: 'pending' | 'paid' | 'cancelled' | 'refunded'
  total: number
}

type AuthUserRow = {
  id: string
  email?: string
  created_at?: string
  last_sign_in_at?: string | null
  app_metadata?: {
    provider?: string
  }
  user_metadata?: {
    name?: string
    admin_disabled?: boolean
  }
  banned_until?: string | null
}

@Injectable()
export class AdminRepository {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly mailService: MailService
  ) {}

  private async safeListUsers(client: any): Promise<AuthUserRow[]> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 200 })
        if (!error && data?.users) {
          return data.users as AuthUserRow[]
        }
        if (error) {
          const isClockSkew = error.message?.includes('JWT') || error.message?.includes('future')
          if (isClockSkew && attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 350))
            continue
          }
          console.warn(`[AdminRepository] listUsers aviso (tentativa ${attempt}):`, error.message)
        }
      } catch (err) {
        const isClockSkew = err instanceof Error && (err.message.includes('JWT') || err.message.includes('future'))
        if (isClockSkew && attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 350))
          continue
        }
        console.warn(`[AdminRepository] listUsers erro inesperado (tentativa ${attempt}):`, err)
      }
    }
    return []
  }

  async getDashboard(): Promise<AdminDashboardData> {
    const client = this.supabase.getClient()

    const [{ data: events, error: eventsError }, { data: orders, error: ordersError }, authUsers] =
      await Promise.all([
        client
          .from('events')
          .select('id, title, slug, date, location, status, organizer_id, capacity, price, created_at')
          .order('date', { ascending: false }),
        client.from('orders').select('id, event_id, user_id, status, total'),
        this.safeListUsers(client),
      ])

    if (eventsError) throw new Error(eventsError.message)
    if (ordersError) throw new Error(ordersError.message)

    const safeEvents = (events ?? []) as EventRow[]
    const safeOrders = (orders ?? []) as OrderRow[]


    const ordersByEvent = new Map<string, { totalOrders: number; paidOrders: number; revenue: number }>()
    const eventCountByOrganizer = new Map<string, number>()

    for (const event of safeEvents) {
      eventCountByOrganizer.set(event.organizer_id, (eventCountByOrganizer.get(event.organizer_id) ?? 0) + 1)
    }

    for (const order of safeOrders) {
      const current = ordersByEvent.get(order.event_id) ?? { totalOrders: 0, paidOrders: 0, revenue: 0 }
      current.totalOrders += 1
      if (order.status === 'paid') {
        current.paidOrders += 1
        current.revenue += Number(order.total ?? 0)
      }
      ordersByEvent.set(order.event_id, current)
    }

    const mappedEvents: AdminEventItem[] = safeEvents.map((event) => {
      const summary = ordersByEvent.get(event.id) ?? { totalOrders: 0, paidOrders: 0, revenue: 0 }
      return {
        id: event.id,
        title: event.title,
        slug: event.slug,
        date: event.date,
        location: event.location,
        status: event.status,
        organizerId: event.organizer_id,
        capacity: event.capacity,
        price: Number(event.price ?? 0),
        createdAt: event.created_at,
        totalOrders: summary.totalOrders,
        paidOrders: summary.paidOrders,
        revenue: summary.revenue,
      }
    })

    const mappedUsers: AdminUserItem[] = authUsers.map((user) => ({
      id: user.id,
      email: user.email ?? 'sem-email',
      name: user.user_metadata?.name ?? user.email ?? 'Usuário sem nome',
      provider: user.app_metadata?.provider ?? 'email',
      lastSignInAt: user.last_sign_in_at ?? null,
      createdAt: user.created_at ?? new Date(0).toISOString(),
      disabled: Boolean(user.user_metadata?.admin_disabled) || Boolean(user.banned_until),
      createdEventsCount: eventCountByOrganizer.get(user.id) ?? 0,
    }))

    const metrics = {
      totalEvents: mappedEvents.length,
      publishedEvents: mappedEvents.filter((event) => event.status === 'published').length,
      draftEvents: mappedEvents.filter((event) => event.status === 'draft').length,
      cancelledEvents: mappedEvents.filter((event) => event.status === 'cancelled').length,
      finishedEvents: mappedEvents.filter((event) => event.status === 'finished').length,
      totalOrders: safeOrders.length,
      paidOrders: safeOrders.filter((order) => order.status === 'paid').length,
      pendingOrders: safeOrders.filter((order) => order.status === 'pending').length,
      refundedOrders: safeOrders.filter((order) => order.status === 'refunded').length,
      totalRevenue: safeOrders
        .filter((order) => order.status === 'paid')
        .reduce((sum, order) => sum + Number(order.total ?? 0), 0),
      totalUsers: mappedUsers.length,
      disabledUsers: mappedUsers.filter((user) => user.disabled).length,
      organizerUsers: mappedUsers.filter((user) => user.createdEventsCount > 0).length,
    }

    return {
      metrics,
      events: mappedEvents,
      users: mappedUsers,
    }
  }

  async updateUserStatus(userId: string, disabled: boolean) {
    const client = this.supabase.getClient()
    const { data: userData, error: userError } = await client.auth.admin.getUserById(userId)

    if (userError) throw new Error(userError.message)

    const existingMetadata = userData.user.user_metadata ?? {}

    const { data, error } = await client.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...existingMetadata,
        admin_disabled: disabled,
      },
      ban_duration: disabled ? '876000h' : 'none',
    })

    if (error) throw new Error(error.message)
    return data.user
  }

  async deleteUser(userId: string) {
    const client = this.supabase.getClient()
    const { error } = await client.auth.admin.deleteUser(userId)
    if (error) throw new Error(error.message)
    return { success: true }
  }

  async updateEventStatus(eventId: string, status: 'draft' | 'published' | 'cancelled' | 'finished') {
    const { data, error } = await this.supabase
      .getClient()
      .from('events')
      .update({ status })
      .eq('id', eventId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  async deleteEvent(eventId: string) {
    const { error } = await this.supabase.getClient().from('events').delete().eq('id', eventId)
    if (error) throw new Error(error.message)
    return { success: true }
  }

  async remindPendingOrders(eventId: string): Promise<{ success: boolean; sentCount: number }> {
    const client = this.supabase.getClient()

    // 1. Obter informações do evento
    const { data: event, error: eventError } = await client
      .from('events')
      .select('title')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      throw new Error(`Evento com ID '${eventId}' não encontrado.`)
    }

    // 2. Buscar pedidos pendentes do evento
    const { data: pendingOrders, error: ordersError } = await client
      .from('orders')
      .select('id, user_id, total, event_id')
      .eq('event_id', eventId)
      .eq('status', 'pending')

    if (ordersError) {
      throw new Error(ordersError.message)
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return { success: true, sentCount: 0 }
    }

    let sentCount = 0

    // 3. Iterar e enviar e-mails
    for (const order of pendingOrders) {
      if (!order.user_id) continue

      try {
        const { data: userData } = await client.auth.admin.getUserById(order.user_id)
        const userEmail = userData?.user?.email
        const userMeta = userData?.user?.user_metadata
        const buyerName = userMeta?.full_name ?? userMeta?.name ?? 'Cliente'

        if (!userEmail) continue

        const formattedTotal = Number(order.total).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })

        const paymentUrl = `http://localhost:3000/checkout/pagamento?orderId=${order.id}&eventId=${order.event_id}&amount=${order.total}`

        const html = `
          <div style="font-family: Inter, system-ui, sans-serif; background: #f8fafc; padding: 32px;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05); border: 1px solid #e2e8f0;">
              <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px; color: #ffffff; text-align: center;">
                <p style="margin: 0; opacity: 0.9; letter-spacing: 0.12em; font-size: 0.85rem; text-transform: uppercase; font-weight: 700;">MyPass360</p>
                <h1 style="margin: 10px 0 0; font-size: 1.8rem; font-weight: 800;">Conclua sua compra!</h1>
              </div>
              <div style="padding: 32px; color: #0f172a; line-height: 1.6;">
                <p style="margin: 0 0 16px; font-size: 1.05rem; font-weight: 700; color: #1e293b;">Olá, ${buyerName},</p>
                <p style="margin: 0 0 16px; color: #475569;">Notamos que você iniciou o processo de compra para o evento <strong>${event.title}</strong>, mas a transação ainda está pendente.</p>
                <p style="margin: 0 0 24px; color: #475569;">Garanta já o seu lugar antes que os ingressos se esgotem! O valor total do seu pedido é de <strong>${formattedTotal}</strong>.</p>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${paymentUrl}" style="display: inline-flex; align-items: center; justify-content: center; padding: 14px 28px; border-radius: 12px; background: #f59e0b; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 0.95rem; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">
                    Finalizar Pagamento
                  </a>
                </div>

                <p style="margin: 24px 0 0; color: #64748b; font-size: 0.88rem; border-top: 1px solid #f1f5f9; padding-top: 16px;">Se você já realizou o pagamento, por favor desconsidere este e-mail. A confirmação pode levar alguns minutos.</p>
                <p style="margin: 8px 0 0; color: #94a3b8; font-size: 0.8rem;">MyPass360 — o seu passaporte para os melhores eventos.</p>
              </div>
            </div>
          </div>
        `

        await this.mailService.sendTicketEmail({
          to: userEmail,
          subject: `Finalize seu pedido para o evento ${event.title} - MyPass360`,
          html,
        })

        sentCount++
      } catch (err) {
        // Logar erro individual mas continuar enviando para outros pendentes
        console.error(`Erro ao enviar lembrete para pedido ${order.id}:`, err)
      }
    }

    return { success: true, sentCount }
  }

  async getEventAttendees(eventId: string): Promise<AdminAttendee[]> {
    const client = this.supabase.getClient()

    // Buscar todos os tickets do evento com tipo de ingresso
    const { data: tickets, error } = await client
      .from('tickets')
      .select('id, public_code, buyer_name, buyer_cpf, buyer_email, status, issued_at, ticket_type_id, ticket_types(name)')
      .eq('event_id', eventId)
      .order('issued_at', { ascending: true })

    if (error) throw new Error(error.message)

    return (tickets ?? []).map((t: any) => ({
      ticketId: t.id,
      publicCode: t.public_code ?? '',
      name: t.buyer_name ?? null,
      cpf: t.buyer_cpf ?? null,
      email: t.buyer_email ?? null,
      ticketTypeName: t.ticket_types?.name ?? 'Ingresso',
      status: t.status ?? 'VALID',
      issuedAt: t.issued_at ?? null,
    }))
  }

  /**
   * Retorna os detalhes consolidados do evento para o modal administrativo.
   */
  async getEventDetails(eventId: string) {
    const client = this.supabase.getClient()

    const { data: event, error: eventErr } = await client
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventErr || !event) {
      throw new Error(`Evento '${eventId}' não encontrado`)
    }

    const { count: totalTickets } = await client
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    const { count: checkedInTickets } = await client
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .in('status', ['CHECKED_IN', 'used'])

    return {
      ...event,
      checkin_enabled: event.checkin_enabled !== false,
      totalTickets: totalTickets ?? 0,
      checkedInTickets: checkedInTickets ?? 0,
    }
  }

  /**
   * Ativa ou desativa a portaria / check-in para o evento como um todo.
   */
  async updateEventCheckinStatus(eventId: string, enabled: boolean) {
    const client = this.supabase.getClient()

    const { data, error } = await client
      .from('events')
      .update({ checkin_enabled: enabled })
      .eq('id', eventId)
      .select('id, checkin_enabled')
      .single()

    if (error) throw new Error(error.message)

    return {
      success: true,
      checkin_enabled: data.checkin_enabled,
    }
  }


  /**
   * Lista todos os acessos de portaria cadastrados para o evento.
   */
  async getCheckinAccesses(eventId: string) {
    const client = this.supabase.getClient()

    const { data, error } = await client
      .from('checkin_accesses')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)

    return (data ?? []).map((a: any) => ({
      id: a.id,
      eventId: a.event_id,
      name: a.name,
      code: a.code,
      isActive: a.is_active,
      createdAt: a.created_at,
      lastUsedAt: a.last_used_at,
    }))
  }

  /**
   * Cria uma nova credencial de check-in vinculada exclusivamente ao evento.
   */
  async createCheckinAccess(eventId: string, name: string) {
    const client = this.supabase.getClient()
    const code = this.generateAccessCode()

    const { data, error } = await client
      .from('checkin_accesses')
      .insert({
        event_id: eventId,
        name: name.trim(),
        code,
        is_active: true,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)

    return {
      id: data.id,
      eventId: data.event_id,
      name: data.name,
      code: data.code,
      isActive: data.is_active,
      createdAt: data.created_at,
      lastUsedAt: data.last_used_at,
    }
  }

  /**
   * Ativa/desativa ou renomeia uma credencial de check-in.
   */
  async updateCheckinAccess(accessId: string, updateData: { name?: string; isActive?: boolean }) {
    const client = this.supabase.getClient()
    const payload: Record<string, unknown> = {}

    if (updateData.name !== undefined) payload.name = updateData.name.trim()
    if (updateData.isActive !== undefined) payload.is_active = updateData.isActive

    const { data, error } = await client
      .from('checkin_accesses')
      .update(payload)
      .eq('id', accessId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)

    return {
      id: data.id,
      eventId: data.event_id,
      name: data.name,
      code: data.code,
      isActive: data.is_active,
      createdAt: data.created_at,
      lastUsedAt: data.last_used_at,
    }
  }

  /**
   * Remove uma credencial de check-in.
   */
  async deleteCheckinAccess(accessId: string) {
    const client = this.supabase.getClient()
    const { error } = await client.from('checkin_accesses').delete().eq('id', accessId)
    if (error) throw new Error(error.message)
    return { success: true }
  }

  /**
   * Lista todos os check-ins realizados no evento, aplicando as regras de privacidade configuradas.
   */
  async getEventCheckins(eventId: string) {
    const client = this.supabase.getClient()

    // 1. Obter o modelo de layout e identificação do evento
    const { data: event } = await client
      .from('events')
      .select('ticket_layout, participant_id_type')
      .eq('id', eventId)
      .single()

    const isAnonymous = event?.ticket_layout !== 'formal_pdf' && event?.participant_id_type === 'none'

    // 2. Buscar registros na tabela de auditoria
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
      .eq('event_id', eventId)
      .order('checked_in_at', { ascending: false })

    if (error) throw new Error(error.message)

    return (records ?? []).map((r: any) => ({
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

  /**
   * Limpa todos os check-ins realizados no evento e restaura os tickets para o status anterior válido.
   *
   * // TODO: Avaliar remoção ou restrição desta ação em produção.
   * // Funcionalidade utilizada atualmente para resetar check-ins durante testes.
   */
  async resetEventCheckins(eventId: string) {
    const client = this.supabase.getClient()

    // 1. Remover todos os registros de check-in da tabela de auditoria
    const { error: deleteErr } = await client
      .from('checkins')
      .delete()
      .eq('event_id', eventId)

    if (deleteErr) {
      console.warn('[AdminRepository] Aviso ao deletar auditoria de checkins:', deleteErr.message)
    }

    // 2. Restaurar o status de todos os tickets utilizados para VALID
    const { error: updateErr, count } = await client
      .from('tickets')
      .update({
        status: 'VALID',
        checked_in_at: null,
        checked_in_by: null,
      })
      .eq('event_id', eventId)
      .in('status', ['CHECKED_IN', 'used'])

    if (updateErr) throw new Error(updateErr.message)

    return {
      success: true,
      message: 'Todos os check-ins do evento foram restaurados com sucesso para estado válido.',
      restoredCount: count ?? 0,
    }
  }

  /**
   * Exclui um registro específico de check-in e restaura o ticket individual para VALID.
   */
  async deleteEventCheckin(eventId: string, checkinId: string) {
    const client = this.supabase.getClient()

    // 1. Buscar o check-in para obter o ticket_id correspondente
    const { data: checkin, error: findErr } = await client
      .from('checkins')
      .select('id, ticket_id, event_id')
      .eq('id', checkinId)
      .eq('event_id', eventId)
      .single()

    if (findErr || !checkin) {
      throw new Error('Registro de check-in não encontrado.')
    }

    // 2. Deletar da tabela de auditoria de checkins
    const { error: delErr } = await client
      .from('checkins')
      .delete()
      .eq('id', checkinId)

    if (delErr) throw new Error(delErr.message)

    // 3. Restaurar o ticket para o status VALID
    const { error: updateErr } = await client
      .from('tickets')
      .update({
        status: 'VALID',
        checked_in_at: null,
        checked_in_by: null,
      })
      .eq('id', checkin.ticket_id)

    if (updateErr) throw new Error(updateErr.message)

    return {
      success: true,
      message: 'Check-in cancelado com sucesso. O ingresso voltou a ser válido.',
    }
  }

  /**
   * Gera um código de acesso seguro e amigável: CKIN-XXXXXXXX
   */

  private generateAccessCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = 'CKIN-'
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }
}

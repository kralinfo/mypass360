import { Injectable } from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'
import type {
  AdminDashboardData,
  AdminEventItem,
  AdminUserItem,
  PublicationHistoryItem,
  DeletionHistoryItem,
  EventOptionItem,
} from '@mypass360/types'
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
      pendingApprovalEvents: 0, // será preenchido abaixo via consulta separada
      pendingDeletionEvents: 0, // será preenchido abaixo via consulta separada
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

    // Contar eventos pendentes de aprovação
    const { count: pendingCount } = await client
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('approval_status', 'pending')

    metrics.pendingApprovalEvents = pendingCount ?? 0

    // Contar eventos com solicitação de exclusão pendente
    const { count: pendingDeletionCount } = await client
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('deletion_status', 'pending')

    metrics.pendingDeletionEvents = pendingDeletionCount ?? 0


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
    const client = this.supabase.getClient()

    const { data: event } = await client
      .from('events')
      .select('id, title, organizer_id')
      .eq('id', eventId)
      .single()

    const { error } = await client.from('events').delete().eq('id', eventId)
    if (error) {
      if (error.code === '23503') {
        await client
          .from('events')
          .update({ status: 'cancelled', deletion_status: 'approved' })
          .eq('id', eventId)
      } else {
        throw new Error(error.message)
      }
    }

    return event
  }

  /**
   * Lista todos os eventos com solicitação de publicação pendente.
   * Inclui dados do organizador e tipos de ingresso para análise completa.
   */
  async getPendingApprovals() {
    const client = this.supabase.getClient()

    const { data: events, error } = await client
      .from('events')
      .select(`
        id,
        title,
        slug,
        description,
        date,
        location,
        organizer_id,
        capacity,
        price,
        image_url,
        genre,
        approval_requested_at,
        created_at,
        ticket_types (
          id,
          name,
          price,
          quantity,
          description
        )
      `)
      .eq('approval_status', 'pending')
      .order('approval_requested_at', { ascending: true })

    if (error) throw new Error(error.message)

    const safeEvents = events ?? []

    // Enriquecer com dados do organizador (busca em lote dos IDs únicos)
    const organizerIds = [...new Set(safeEvents.map((e: any) => e.organizer_id).filter(Boolean))]
    let organizerMap = new Map<string, { email: string; name: string }>()

    if (organizerIds.length > 0) {
      try {
        const authUsers = await this.safeListUsers(client)
        for (const user of authUsers) {
          if (organizerIds.includes(user.id)) {
            organizerMap.set(user.id, {
              email: user.email ?? '',
              name: user.user_metadata?.name ?? user.email ?? 'Sem nome',
            })
          }
        }
      } catch {
        // Se falhar, continua sem dados do organizador
      }
    }

    return safeEvents.map((event: any) => {
      const organizer = organizerMap.get(event.organizer_id)
      return {
        id: event.id,
        title: event.title,
        slug: event.slug,
        description: event.description,
        date: event.date,
        location: event.location,
        organizerId: event.organizer_id,
        organizerEmail: organizer?.email,
        organizerName: organizer?.name,
        capacity: event.capacity,
        price: Number(event.price ?? 0),
        imageUrl: event.image_url,
        genre: event.genre,
        approvalRequestedAt: event.approval_requested_at,
        ticketTypes: event.ticket_types ?? [],
        createdAt: event.created_at,
      }
    })
  }

  /**
   * Aprova a solicitação de publicação de um evento.
   * Define approval_status = 'approved' e registra o administrador responsável.
   */
  async approveEvent(eventId: string, adminId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('events')
      .update({
        approval_status: 'approved',
        approval_reviewed_at: new Date().toISOString(),
        approved_by: adminId,
      })
      .eq('id', eventId)
      .eq('approval_status', 'pending') // só aprova se estiver pendente
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Evento não encontrado ou não está aguardando aprovação.')
    return data
  }

  /**
   * Rejeita a solicitação de publicação de um evento.
   * Define approval_status = 'rejected' e registra o administrador e a justificativa.
   */
  async rejectEvent(eventId: string, adminId: string, reason?: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('events')
      .update({
        approval_status: 'rejected',
        approval_reviewed_at: new Date().toISOString(),
        approved_by: adminId,
        approval_rejection_reason: reason ?? null,
      })
      .eq('id', eventId)
      .eq('approval_status', 'pending') // só rejeita se estiver pendente
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Evento não encontrado ou não está aguardando aprovação.')
    return data
  }

  /**
   * Lista todos os eventos com solicitação de exclusão pendente.
   * Enriquecidos com dados do organizador e métricas comerciais.
   */
  async getPendingDeletions() {
    const client = this.supabase.getClient()

    const { data: events, error } = await client
      .from('events')
      .select(`
        id,
        title,
        slug,
        description,
        date,
        location,
        status,
        organizer_id,
        capacity,
        price,
        image_url,
        genre,
        deletion_requested_at,
        deletion_reason,
        created_at,
        ticket_types (
          id,
          name,
          price,
          quantity,
          description
        )
      `)
      .eq('deletion_status', 'pending')
      .order('deletion_requested_at', { ascending: true })

    if (error) throw new Error(error.message)

    const safeEvents = events ?? []
    if (safeEvents.length === 0) return []

    // Buscar pedidos e ingressos associados para métricas comerciais
    const eventIds = safeEvents.map((e: any) => e.id)

    const { data: orders } = await client
      .from('orders')
      .select('id, event_id, status, total')
      .in('event_id', eventIds)

    const { data: tickets } = await client
      .from('tickets')
      .select('id, event_id')
      .in('event_id', eventIds)

    const safeOrders = orders ?? []
    const safeTickets = tickets ?? []

    // Buscar dados dos organizadores
    const organizerIds = [...new Set(safeEvents.map((e: any) => e.organizer_id).filter(Boolean))]
    let organizerMap = new Map<string, { email: string; name: string }>()

    if (organizerIds.length > 0) {
      try {
        const authUsers = await this.safeListUsers(client)
        for (const user of authUsers) {
          if (organizerIds.includes(user.id)) {
            organizerMap.set(user.id, {
              email: user.email ?? '',
              name: user.user_metadata?.name ?? user.email ?? 'Sem nome',
            })
          }
        }
      } catch {
        // ignora se falhar listUsers
      }
    }

    return safeEvents.map((event: any) => {
      const organizer = organizerMap.get(event.organizer_id)
      const eventOrders = safeOrders.filter((o: any) => o.event_id === event.id)
      const paidOrders = eventOrders.filter((o: any) => o.status === 'paid')
      const eventTickets = safeTickets.filter((t: any) => t.event_id === event.id)
      const revenue = paidOrders.reduce((sum: number, o: any) => sum + Number(o.total ?? 0), 0)

      return {
        id: event.id,
        title: event.title,
        slug: event.slug,
        description: event.description,
        date: event.date,
        location: event.location,
        status: event.status,
        organizerId: event.organizer_id,
        organizerEmail: organizer?.email,
        organizerName: organizer?.name,
        capacity: event.capacity,
        price: Number(event.price ?? 0),
        imageUrl: event.image_url,
        genre: event.genre,
        deletionRequestedAt: event.deletion_requested_at,
        deletionReason: event.deletion_reason ?? 'Não informado',
        totalOrders: eventOrders.length,
        paidOrders: paidOrders.length,
        revenue,
        totalAttendees: eventTickets.length,
        ticketTypes: event.ticket_types ?? [],
        createdAt: event.created_at,
      }
    })
  }

  /**
   * Aprova a solicitação de exclusão do evento.
   * Realiza arquivamento/desativação segura: deletion_status = 'approved', status = 'cancelled'.
   */
  async approveDeletion(eventId: string, adminId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('events')
      .update({
        deletion_status: 'approved',
        status: 'cancelled',
        deletion_reviewed_at: new Date().toISOString(),
        deletion_reviewed_by: adminId,
      })
      .eq('id', eventId)
      .eq('deletion_status', 'pending')
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Evento não encontrado ou não está aguardando solicitação de exclusão.')
    return data
  }

  /**
   * Rejeita a solicitação de exclusão do evento.
   * Restaura deletion_status = 'rejected' e mantém status = 'published'.
   */
  async rejectDeletion(eventId: string, adminId: string, reason?: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('events')
      .update({
        deletion_status: 'rejected',
        status: 'published',
        deletion_reviewed_at: new Date().toISOString(),
        deletion_reviewed_by: adminId,
        deletion_rejection_reason: reason ?? null,
      })
      .eq('id', eventId)
      .eq('deletion_status', 'pending')
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    if (!data) throw new Error('Evento não encontrado ou não está aguardando solicitação de exclusão.')
    return data
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
   * Retorna os detalhes consolidados do evento para o modal administrativo e de gestão.
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

    // Buscar tipos de ingresso com quantidades e vendas
    const { data: ticketTypes } = await client
      .from('ticket_types')
      .select('id, name, price, quantity, sold, description')
      .eq('event_id', eventId)
      .order('price', { ascending: false })

    // Buscar pedidos para métricas financeiras
    const { data: orders } = await client
      .from('orders')
      .select('id, status, total, created_at')
      .eq('event_id', eventId)

    const paidOrders = (orders ?? []).filter((o: any) => o.status === 'paid')
    const pendingOrders = (orders ?? []).filter((o: any) => o.status === 'pending')
    const cancelledOrders = (orders ?? []).filter((o: any) => o.status === 'cancelled' || o.status === 'refunded')

    let totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0)

    // Fallback: se pedidos não possuem total consolidado mas há tickets vendidos por lote
    if (totalRevenue === 0 && (ticketTypes ?? []).length > 0) {
      totalRevenue = (ticketTypes ?? []).reduce(
        (sum: number, tt: any) => sum + ((Number(tt.sold) || 0) * (Number(tt.price) || 0)),
        0
      )
    }

    // Se ainda for 0, usa event.price * totalTickets
    if (totalRevenue === 0 && Number(event.price) > 0) {
      totalRevenue = Number(event.price) * (totalTickets ?? 0)
    }

    const totalTicketsSold = totalTickets ?? 0
    const averageTicketPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : (Number(event.price) || 0)
    const occupancyRate = event.capacity > 0 ? Math.min(100, Math.round((totalTicketsSold / event.capacity) * 100)) : 0

    const formattedTicketTypes = (ticketTypes ?? []).map((tt: any) => {
      const sold = Number(tt.sold) || 0
      const price = Number(tt.price) || 0
      const quantity = Number(tt.quantity) || 0
      return {
        id: tt.id,
        name: tt.name,
        price,
        quantity,
        sold,
        description: tt.description ?? '',
        revenue: sold * price,
        percentageSold: quantity > 0 ? Math.min(100, Math.round((sold / quantity) * 100)) : 0,
      }
    })

    return {
      ...event,
      checkin_enabled: event.checkin_enabled !== false,
      totalTickets: totalTicketsSold,
      checkedInTickets: checkedInTickets ?? 0,
      ticketTypes: formattedTicketTypes,
      financialSummary: {
        totalRevenue,
        paidOrdersCount: paidOrders.length,
        pendingOrdersCount: pendingOrders.length,
        cancelledOrdersCount: cancelledOrders.length,
        totalTicketsSold,
        averageTicketPrice,
        occupancyRate,
      },
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
   * Retorna o histórico de mensagens/diálogo trocado entre administradores e organizador sobre o evento.
   */
  async getEventMessages(eventId: string) {
    const client = this.supabase.getClient()

    const { data: notifs, error } = await client
      .from('notifications')
      .select('id, type, title, message, metadata, created_at, user_id')
      .eq('entity_id', eventId)
      .in('type', ['admin_message', 'organizer_reply'])
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)

    const mapped = (notifs ?? []).map((n: any) => {
      const isAdminMsg = n.type === 'admin_message'
      const rawMsg = isAdminMsg
        ? (n.metadata?.adminMessage || n.message)
        : (n.metadata?.replyMessage || n.message)

      // Se a mensagem começar com "O organizador do evento ... respondeu: ", limpar prefixo para exibição limpa no chat
      let cleanMessage = rawMsg
      const replyPrefixMatch = cleanMessage.match(/^O organizador do evento ".*" respondeu: "(.*)"$/s)
      if (replyPrefixMatch && replyPrefixMatch[1]) {
        cleanMessage = replyPrefixMatch[1]
      }

      return {
        id: n.id,
        sender: isAdminMsg ? ('admin' as const) : ('organizer' as const),
        senderName: isAdminMsg ? 'Administração' : 'Organizador',
        message: cleanMessage,
        createdAt: n.created_at,
      }
    })

    // Deduplicar mensagens idênticas geradas por broadcast para múltiplos administradores
    const seen = new Set<string>()
    const deduplicated = []
    for (const item of mapped) {
      const timeBucket = item.createdAt ? String(item.createdAt).substring(0, 16) : ''
      const key = `${item.sender}:${item.message.trim()}:${timeBucket}`
      if (!seen.has(key)) {
        seen.add(key)
        deduplicated.push(item)
      }
    }

    return deduplicated
  }

  /**
   * Retorna a lista de todas as conversas/diálogos ativos agrupados por evento.
   */
  async getAllConversations() {
    const client = this.supabase.getClient()

    // 1. Buscar todas as notificações de mensagem
    const { data: notifs, error: notifError } = await client
      .from('notifications')
      .select('id, type, title, message, metadata, entity_id, created_at, user_id')
      .in('type', ['admin_message', 'organizer_reply', 'event_deletion_requested'])
      .order('created_at', { ascending: false })

    if (notifError) throw new Error(notifError.message)

    // Coletar IDs únicos de eventos envolvidos
    const eventIds = Array.from(new Set((notifs ?? []).map((n) => n.entity_id).filter(Boolean)))
    if (eventIds.length === 0) return []

    // 2. Buscar detalhes dos eventos
    const { data: events, error: eventsError } = await client
      .from('events')
      .select('id, title, slug, status, approval_status, deletion_status, organizer_id')
      .in('id', eventIds)

    if (eventsError) throw new Error(eventsError.message)
    const eventMap = new Map((events ?? []).map((e) => [e.id, e]))

    // 3. Montar a lista consolidada de conversas por evento
    const conversationsMap = new Map<string, any>()

    for (const n of notifs ?? []) {
      if (!n.entity_id || conversationsMap.has(n.entity_id)) continue
      const event = eventMap.get(n.entity_id)
      if (!event) continue

      const isAdminMsg = n.type === 'admin_message'
      const rawMsg = isAdminMsg
        ? (n.metadata?.adminMessage || n.message)
        : (n.metadata?.replyMessage || n.message)

      let cleanMessage = rawMsg
      const replyPrefixMatch = cleanMessage.match(/^O organizador do evento ".*" respondeu: "(.*)"$/s)
      if (replyPrefixMatch && replyPrefixMatch[1]) {
        cleanMessage = replyPrefixMatch[1]
      }

      conversationsMap.set(n.entity_id, {
        eventId: event.id,
        eventTitle: event.title,
        eventStatus: event.status,
        deletionStatus: event.deletion_status ?? 'none',
        organizerId: event.organizer_id,
        lastMessage: cleanMessage,
        lastSender: isAdminMsg ? 'admin' : 'organizer',
        lastMessageAt: n.created_at,
      })
    }

    return Array.from(conversationsMap.values())
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

  /**
   * Consulta o histórico de solicitações de publicação processadas (aprovadas/rejeitadas).
   */
  async getPublicationHistory(query: { limit?: number; page?: number; eventId?: string }) {
    const client = this.supabase.getClient()
    const page = query.page && query.page > 0 ? query.page : 1
    const eventId = query.eventId?.trim()
    const limit = query.limit ?? (eventId ? 100 : 10)
    const from = (page - 1) * limit
    const to = from + limit - 1

    let req = client
      .from('events')
      .select('*', { count: 'exact' })
      .in('approval_status', ['approved', 'rejected'])
      .order('approval_reviewed_at', { ascending: false, nullsFirst: false })

    if (eventId) {
      req = req.eq('id', eventId)
    }

    req = req.range(from, to)

    const { data: events, count, error } = await req
    if (error) throw new Error(error.message)

    const safeEvents = events ?? []
    if (safeEvents.length === 0) {
      return { items: [], total: count ?? 0, page, limit }
    }

    const userIds = [
      ...new Set([
        ...safeEvents.map((e: any) => e.organizer_id),
        ...safeEvents.map((e: any) => e.approved_by),
      ].filter(Boolean))
    ]

    let userMap = new Map<string, { email: string; name: string }>()
    if (userIds.length > 0) {
      try {
        const authUsers = await this.safeListUsers(client)
        for (const user of authUsers) {
          if (userIds.includes(user.id)) {
            userMap.set(user.id, {
              email: user.email ?? '',
              name: user.user_metadata?.name ?? user.email ?? 'Sem nome',
            })
          }
        }
      } catch {
        // Silencioso
      }
    }

    const items: PublicationHistoryItem[] = safeEvents.map((e: any) => {
      const organizer = userMap.get(e.organizer_id)
      const reviewer = userMap.get(e.approved_by)

      return {
        id: e.id,
        title: e.title,
        slug: e.slug,
        organizerId: e.organizer_id,
        organizerName: organizer?.name,
        organizerEmail: organizer?.email,
        approvalStatus: e.approval_status,
        approvalRequestedAt: e.approval_requested_at,
        approvalReviewedAt: e.approval_reviewed_at,
        approvedBy: e.approved_by,
        reviewerName: reviewer?.name,
        reviewerEmail: reviewer?.email,
        approvalRejectionReason: e.approval_rejection_reason,
        createdAt: e.created_at,
      }
    })

    return { items, total: count ?? items.length, page, limit }
  }

  /**
   * Consulta o histórico de solicitações de exclusão processadas (aprovadas/rejeitadas).
   */
  async getDeletionHistory(query: { limit?: number; page?: number; eventId?: string }) {
    const client = this.supabase.getClient()
    const page = query.page && query.page > 0 ? query.page : 1
    const eventId = query.eventId?.trim()
    const limit = query.limit ?? (eventId ? 100 : 10)
    const from = (page - 1) * limit
    const to = from + limit - 1

    let req = client
      .from('events')
      .select('*', { count: 'exact' })
      .in('deletion_status', ['approved', 'rejected'])
      .order('deletion_reviewed_at', { ascending: false, nullsFirst: false })

    if (eventId) {
      req = req.eq('id', eventId)
    }

    req = req.range(from, to)

    const { data: events, count, error } = await req
    if (error) throw new Error(error.message)

    const safeEvents = events ?? []
    if (safeEvents.length === 0) {
      return { items: [], total: count ?? 0, page, limit }
    }

    const userIds = [
      ...new Set([
        ...safeEvents.map((e: any) => e.organizer_id),
        ...safeEvents.map((e: any) => e.deletion_reviewed_by),
      ].filter(Boolean))
    ]

    let userMap = new Map<string, { email: string; name: string }>()
    if (userIds.length > 0) {
      try {
        const authUsers = await this.safeListUsers(client)
        for (const user of authUsers) {
          if (userIds.includes(user.id)) {
            userMap.set(user.id, {
              email: user.email ?? '',
              name: user.user_metadata?.name ?? user.email ?? 'Sem nome',
            })
          }
        }
      } catch {
        // Silencioso
      }
    }

    const items: DeletionHistoryItem[] = safeEvents.map((e: any) => {
      const organizer = userMap.get(e.organizer_id)
      const reviewer = userMap.get(e.deletion_reviewed_by)

      return {
        id: e.id,
        title: e.title,
        slug: e.slug,
        organizerId: e.organizer_id,
        organizerName: organizer?.name,
        organizerEmail: organizer?.email,
        deletionStatus: e.deletion_status,
        deletionRequestedAt: e.deletion_requested_at,
        deletionReason: e.deletion_reason,
        deletionReviewedAt: e.deletion_reviewed_at,
        deletionReviewedBy: e.deletion_reviewed_by,
        reviewerName: reviewer?.name,
        reviewerEmail: reviewer?.email,
        deletionRejectionReason: e.deletion_rejection_reason,
        createdAt: e.created_at,
      }
    })

    return { items, total: count ?? items.length, page, limit }
  }

  /**
   * Retorna opções de eventos para o seletor pesquisável.
   */
  async getEventOptions(search?: string) {
    const client = this.supabase.getClient()

    let query = client
      .from('events')
      .select('id, title, slug')
      .order('title', { ascending: true })
      .limit(50)

    if (search && search.trim().length > 0) {
      query = query.ilike('title', `%${search.trim()}%`)
    }

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []) as EventOptionItem[]
  }
}

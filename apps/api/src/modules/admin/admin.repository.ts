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

  async getDashboard(): Promise<AdminDashboardData> {
    const client = this.supabase.getClient()

    const [{ data: events, error: eventsError }, { data: orders, error: ordersError }, { data: usersData, error: usersError }] =
      await Promise.all([
        client
          .from('events')
          .select('id, title, slug, date, location, status, organizer_id, capacity, price, created_at')
          .order('date', { ascending: false }),
        client.from('orders').select('id, event_id, user_id, status, total'),
        client.auth.admin.listUsers({ page: 1, perPage: 200 }),
      ])

    if (eventsError) throw new Error(eventsError.message)
    if (ordersError) throw new Error(ordersError.message)
    if (usersError) throw new Error(usersError.message)

    const safeEvents = (events ?? []) as EventRow[]
    const safeOrders = (orders ?? []) as OrderRow[]
    const authUsers = (usersData?.users ?? []) as AuthUserRow[]

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
}
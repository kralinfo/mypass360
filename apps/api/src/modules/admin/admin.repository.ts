import { Injectable } from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'
import type { AdminDashboardData, AdminEventItem, AdminUserItem } from '@mypass360/types'

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
  constructor(private readonly supabase: SupabaseService) {}

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
}
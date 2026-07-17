import type { EventStatus } from './event.types'

export interface AdminDashboardMetrics {
  totalEvents: number
  publishedEvents: number
  draftEvents: number
  cancelledEvents: number
  finishedEvents: number
  totalOrders: number
  paidOrders: number
  pendingOrders: number
  refundedOrders: number
  totalRevenue: number
  totalUsers: number
  disabledUsers: number
  organizerUsers: number
}

export interface AdminEventItem {
  id: string
  title: string
  slug: string
  date: string
  location: string
  status: EventStatus
  organizerId: string
  capacity: number
  price: number
  createdAt: string
  totalOrders: number
  paidOrders: number
  revenue: number
}

export interface AdminUserItem {
  id: string
  email: string
  name: string
  provider: string
  lastSignInAt: string | null
  createdAt: string
  disabled: boolean
  createdEventsCount: number
}

export interface AdminDashboardData {
  metrics: AdminDashboardMetrics
  events: AdminEventItem[]
  users: AdminUserItem[]
}

export interface UpdateAdminUserStatusInput {
  disabled: boolean
}

export interface UpdateAdminEventStatusInput {
  status: EventStatus
}
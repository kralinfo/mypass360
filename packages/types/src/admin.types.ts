import type { ApprovalStatus, DeletionStatus, EventStatus } from './event.types'

export interface AdminDashboardMetrics {
  totalEvents: number
  publishedEvents: number
  draftEvents: number
  cancelledEvents: number
  finishedEvents: number
  /** Eventos com approval_status = 'pending' aguardando análise */
  pendingApprovalEvents: number
  /** Eventos com deletion_status = 'pending' aguardando análise de exclusão */
  pendingDeletionEvents: number
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
  /** Estado de solicitação de exclusão */
  deletionStatus?: DeletionStatus
  deletionRequestedAt?: string | null
  deletionReason?: string | null
  deletionReviewedAt?: string | null
  deletionReviewedBy?: string | null
  deletionRejectionReason?: string | null
}

/**
 * Item de evento com solicitação de publicação pendente.
 * Usado na área "Aprovar Publicações" do painel admin.
 */
export interface PendingApprovalEventItem {
  id: string
  title: string
  slug: string
  description: string
  date: string
  location: string
  organizerId: string
  organizerEmail?: string
  organizerName?: string
  capacity: number
  price: number
  imageUrl?: string | null
  genre?: string | null
  approvalRequestedAt: string
  ticketTypes?: Array<{
    id: string
    name: string
    price: number
    quantity: number
    description?: string
  }>
  createdAt: string
}

/**
 * Item de evento com solicitação de exclusão pendente.
 * Usado na área "Aprovar Exclusões" do painel admin.
 */
export interface PendingDeletionEventItem {
  id: string
  title: string
  slug: string
  description: string
  date: string
  location: string
  status: EventStatus
  organizerId: string
  organizerEmail?: string
  organizerName?: string
  capacity: number
  price: number
  imageUrl?: string | null
  genre?: string | null
  deletionRequestedAt: string
  deletionReason: string
  totalOrders: number
  paidOrders: number
  revenue: number
  totalAttendees: number
  ticketTypes?: Array<{
    id: string
    name: string
    price: number
    quantity: number
    description?: string
  }>
  createdAt: string
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
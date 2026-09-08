import { api, apiWithAuth } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import type {
  AdminDashboardData,
  AdminEventItem,
  AdminUserItem,
  CheckinAccess,
  CheckinRecord,
  Event,
  EventStatus,
  PendingApprovalEventItem,
  PendingDeletionEventItem,
  PublicationHistoryItem,
  DeletionHistoryItem,
  EventOptionItem,
} from '@mypass360/types'

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

export interface EventTicketTypeSummary {
  id: string
  name: string
  price: number
  quantity: number
  sold: number
  description?: string
  revenue: number
  percentageSold: number
}

export interface EventFinancialSummary {
  totalRevenue: number
  paidOrdersCount: number
  pendingOrdersCount: number
  cancelledOrdersCount: number
  totalTicketsSold: number
  averageTicketPrice: number
  occupancyRate: number
}

export interface AdminEventDetails extends Event {
  totalTickets: number
  checkedInTickets: number
  ticketTypes?: EventTicketTypeSummary[]
  financialSummary?: EventFinancialSummary
}

export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  return api.get<AdminDashboardData>('/admin/dashboard')
}

export async function updateAdminEventStatus(eventId: string, status: EventStatus): Promise<AdminEventItem> {
  return api.patch<AdminEventItem>(`/admin/events/${eventId}/status`, { status })
}

export async function deleteAdminEvent(eventId: string, reason?: string): Promise<{ success: boolean }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const authApi = apiWithAuth(session?.access_token ?? '')
  return authApi.post<{ success: boolean }>(`/admin/events/${eventId}/delete`, { reason })
}

export async function updateAdminUserStatus(userId: string, disabled: boolean): Promise<AdminUserItem> {
  return api.patch<AdminUserItem>(`/admin/users/${userId}/status`, { disabled })
}

export async function deleteAdminUser(userId: string): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/admin/users/${userId}`)
}

export async function sendPendingReminders(eventId: string): Promise<{ success: boolean; sentCount: number }> {
  return api.post<{ success: boolean; sentCount: number }>(`/admin/events/${eventId}/remind-pending`, {})
}

/**
 * Lista eventos com solicitação de publicação pendente.
 */
export async function fetchPendingApprovals(): Promise<PendingApprovalEventItem[]> {
  return api.get<PendingApprovalEventItem[]>('/admin/events/pending-approvals')
}

/**
 * Aprova a solicitação de publicação de um evento.
 * Requer autenticação com token de administrador.
 */
export async function approveEventPublication(eventId: string): Promise<Event> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const authApi = apiWithAuth(session?.access_token ?? '')
  return authApi.post<Event>(`/admin/events/${eventId}/approve`, {})
}

/**
 * Rejeita a solicitação de publicação de um evento.
 * Requer autenticação com token de administrador.
 */
export async function rejectEventPublication(eventId: string, reason?: string): Promise<Event> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const authApi = apiWithAuth(session?.access_token ?? '')
  return authApi.post<Event>(`/admin/events/${eventId}/reject`, { reason })
}

/**
 * Lista eventos com solicitação de exclusão pendente.
 */
export async function fetchPendingDeletions(): Promise<PendingDeletionEventItem[]> {
  return api.get<PendingDeletionEventItem[]>('/admin/events/pending-deletions')
}

/**
 * Aprova a exclusão do evento (arquivamento/desativação segura).
 */
export async function approveEventDeletion(eventId: string): Promise<Event> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const authApi = apiWithAuth(session?.access_token ?? '')
  return authApi.post<Event>(`/admin/events/${eventId}/approve-deletion`, {})
}

/**
 * Rejeita a solicitação de exclusão do evento.
 */
export async function rejectEventDeletion(eventId: string, reason?: string): Promise<Event> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const authApi = apiWithAuth(session?.access_token ?? '')
  return authApi.post<Event>(`/admin/events/${eventId}/reject-deletion`, { reason })
}

export interface EventMessageItem {
  id: string
  sender: 'admin' | 'organizer'
  senderName: string
  message: string
  createdAt: string
}

/**
 * Envia mensagem personalizada da administração para o organizador do evento.
 */
export async function contactEventOrganizer(eventId: string, message: string): Promise<{ success: boolean }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const authApi = apiWithAuth(session?.access_token ?? '')
  return authApi.post<{ success: boolean }>(`/admin/events/${eventId}/contact-organizer`, { message })
}

export interface AdminConversationItem {
  eventId: string
  eventTitle: string
  eventStatus: string
  deletionStatus: string
  organizerId: string
  lastMessage: string
  lastSender: 'admin' | 'organizer'
  lastMessageAt: string
}

/**
 * Busca todas as conversas/diálogos ativos com os organizadores.
 */
export async function fetchConversations(): Promise<AdminConversationItem[]> {
  return api.get<AdminConversationItem[]>('/admin/conversations')
}

/**
 * Busca o histórico completo de mensagens/diálogo trocado entre admin e organizador sobre o evento.
 */
export async function fetchEventMessages(eventId: string): Promise<EventMessageItem[]> {
  return api.get<EventMessageItem[]>(`/admin/events/${eventId}/messages`)
}

export async function fetchEventAttendees(eventId: string): Promise<AdminAttendee[]> {
  return api.get<AdminAttendee[]>(`/admin/events/${eventId}/attendees`)
}

function isAdminContext(): boolean {
  if (typeof window !== 'undefined') {
    return window.location.pathname.startsWith('/admin')
  }
  return false
}

async function getAuthApi() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return apiWithAuth(session?.access_token ?? '')
}

export async function fetchEventDetails(eventId: string): Promise<AdminEventDetails> {
  if (isAdminContext()) {
    return api.get<AdminEventDetails>(`/admin/events/${eventId}/details`)
  }
  try {
    const authApi = await getAuthApi()
    return await authApi.get<AdminEventDetails>(`/events/${eventId}/details`)
  } catch {
    return api.get<AdminEventDetails>(`/admin/events/${eventId}/details`)
  }
}

export async function fetchEventCheckinAccesses(eventId: string): Promise<CheckinAccess[]> {
  if (isAdminContext()) {
    return api.get<CheckinAccess[]>(`/admin/events/${eventId}/checkin-accesses`)
  }
  try {
    const authApi = await getAuthApi()
    return await authApi.get<CheckinAccess[]>(`/events/${eventId}/checkin-accesses`)
  } catch {
    return api.get<CheckinAccess[]>(`/admin/events/${eventId}/checkin-accesses`)
  }
}

export async function createEventCheckinAccess(eventId: string, name: string): Promise<CheckinAccess> {
  if (isAdminContext()) {
    return api.post<CheckinAccess>(`/admin/events/${eventId}/checkin-accesses`, { name })
  }
  try {
    const authApi = await getAuthApi()
    return await authApi.post<CheckinAccess>(`/events/${eventId}/checkin-accesses`, { name })
  } catch {
    return api.post<CheckinAccess>(`/admin/events/${eventId}/checkin-accesses`, { name })
  }
}

export async function updateEventCheckinAccess(
  eventId: string,
  accessId: string,
  data: { name?: string; isActive?: boolean }
): Promise<CheckinAccess> {
  if (isAdminContext()) {
    return api.patch<CheckinAccess>(`/admin/events/${eventId}/checkin-accesses/${accessId}`, data)
  }
  try {
    const authApi = await getAuthApi()
    return await authApi.patch<CheckinAccess>(`/events/${eventId}/checkin-accesses/${accessId}`, data)
  } catch {
    return api.patch<CheckinAccess>(`/admin/events/${eventId}/checkin-accesses/${accessId}`, data)
  }
}

export async function deleteEventCheckinAccess(eventId: string, accessId: string): Promise<{ success: boolean }> {
  if (isAdminContext()) {
    return api.delete<{ success: boolean }>(`/admin/events/${eventId}/checkin-accesses/${accessId}`)
  }
  try {
    const authApi = await getAuthApi()
    return await authApi.delete<{ success: boolean }>(`/events/${eventId}/checkin-accesses/${accessId}`)
  } catch {
    return api.delete<{ success: boolean }>(`/admin/events/${eventId}/checkin-accesses/${accessId}`)
  }
}

export async function fetchEventCheckins(eventId: string): Promise<CheckinRecord[]> {
  if (isAdminContext()) {
    return api.get<CheckinRecord[]>(`/admin/events/${eventId}/checkins`)
  }
  try {
    const authApi = await getAuthApi()
    return await authApi.get<CheckinRecord[]>(`/events/${eventId}/checkins`)
  } catch {
    return api.get<CheckinRecord[]>(`/admin/events/${eventId}/checkins`)
  }
}

export async function updateEventCheckinStatus(
  eventId: string,
  enabled: boolean
): Promise<{ success: boolean; checkin_enabled: boolean }> {
  if (isAdminContext()) {
    return api.patch<{ success: boolean; checkin_enabled: boolean }>(`/admin/events/${eventId}/checkin-status`, {
      enabled,
    })
  }
  try {
    const authApi = await getAuthApi()
    return await authApi.patch<{ success: boolean; checkin_enabled: boolean }>(`/events/${eventId}/checkin-status`, {
      enabled,
    })
  } catch {
    return api.patch<{ success: boolean; checkin_enabled: boolean }>(`/admin/events/${eventId}/checkin-status`, {
      enabled,
    })
  }
}

export async function deleteEventCheckin(
  eventId: string,
  checkinId: string
): Promise<{ success: boolean; message: string }> {
  if (isAdminContext()) {
    return api.delete<{ success: boolean; message: string }>(`/admin/events/${eventId}/checkins/${checkinId}`)
  }
  try {
    const authApi = await getAuthApi()
    return await authApi.delete<{ success: boolean; message: string }>(`/events/${eventId}/checkins/${checkinId}`)
  } catch {
    return api.delete<{ success: boolean; message: string }>(`/admin/events/${eventId}/checkins/${checkinId}`)
  }
}

/**
 * Limpa todos os check-ins do evento para testes.
 */
export async function resetEventCheckins(eventId: string): Promise<{ success: boolean; message: string; restoredCount: number }> {
  if (isAdminContext()) {
    return api.delete<{ success: boolean; message: string; restoredCount: number }>(`/admin/events/${eventId}/checkins`)
  }
  try {
    const authApi = await getAuthApi()
    return await authApi.delete<{ success: boolean; message: string; restoredCount: number }>(`/events/${eventId}/checkins`)
  } catch {
    return api.delete<{ success: boolean; message: string; restoredCount: number }>(`/admin/events/${eventId}/checkins`)
  }
}

export interface HistoryResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export async function fetchPublicationHistory(params?: {
  eventId?: string
  limit?: number
  page?: number
}): Promise<HistoryResponse<PublicationHistoryItem>> {
  const query = new URLSearchParams()
  if (params?.eventId) query.append('eventId', params.eventId)
  if (params?.limit) query.append('limit', params.limit.toString())
  if (params?.page) query.append('page', params.page.toString())
  const queryString = query.toString() ? `?${query.toString()}` : ''
  return api.get<HistoryResponse<PublicationHistoryItem>>(`/admin/publications/history${queryString}`)
}

export async function fetchDeletionHistory(params?: {
  eventId?: string
  limit?: number
  page?: number
}): Promise<HistoryResponse<DeletionHistoryItem>> {
  const query = new URLSearchParams()
  if (params?.eventId) query.append('eventId', params.eventId)
  if (params?.limit) query.append('limit', params.limit.toString())
  if (params?.page) query.append('page', params.page.toString())
  const queryString = query.toString() ? `?${query.toString()}` : ''
  return api.get<HistoryResponse<DeletionHistoryItem>>(`/admin/deletions/history${queryString}`)
}

export async function fetchEventOptions(search?: string): Promise<EventOptionItem[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : ''
  return api.get<EventOptionItem[]>(`/admin/events/options${query}`)
}



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

export interface AdminEventDetails extends Event {
  totalTickets: number
  checkedInTickets: number
}

export async function fetchAdminDashboard(): Promise<AdminDashboardData> {
  return api.get<AdminDashboardData>('/admin/dashboard')
}

export async function updateAdminEventStatus(eventId: string, status: EventStatus): Promise<AdminEventItem> {
  return api.patch<AdminEventItem>(`/admin/events/${eventId}/status`, { status })
}

export async function deleteAdminEvent(eventId: string): Promise<{ success: boolean }> {
  return api.delete<{ success: boolean }>(`/admin/events/${eventId}`)
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

export async function fetchEventAttendees(eventId: string): Promise<AdminAttendee[]> {
  return api.get<AdminAttendee[]>(`/admin/events/${eventId}/attendees`)
}

async function getAuthApi() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return apiWithAuth(session?.access_token ?? '')
}

export async function fetchEventDetails(eventId: string): Promise<AdminEventDetails> {
  const authApi = await getAuthApi()
  return authApi.get<AdminEventDetails>(`/events/${eventId}/details`)
}

export async function fetchEventCheckinAccesses(eventId: string): Promise<CheckinAccess[]> {
  const authApi = await getAuthApi()
  return authApi.get<CheckinAccess[]>(`/events/${eventId}/checkin-accesses`)
}

export async function createEventCheckinAccess(eventId: string, name: string): Promise<CheckinAccess> {
  const authApi = await getAuthApi()
  return authApi.post<CheckinAccess>(`/events/${eventId}/checkin-accesses`, { name })
}

export async function updateEventCheckinAccess(
  eventId: string,
  accessId: string,
  data: { name?: string; isActive?: boolean }
): Promise<CheckinAccess> {
  const authApi = await getAuthApi()
  return authApi.patch<CheckinAccess>(`/events/${eventId}/checkin-accesses/${accessId}`, data)
}

export async function deleteEventCheckinAccess(eventId: string, accessId: string): Promise<{ success: boolean }> {
  const authApi = await getAuthApi()
  return authApi.delete<{ success: boolean }>(`/events/${eventId}/checkin-accesses/${accessId}`)
}

export async function fetchEventCheckins(eventId: string): Promise<CheckinRecord[]> {
  const authApi = await getAuthApi()
  return authApi.get<CheckinRecord[]>(`/events/${eventId}/checkins`)
}

export async function updateEventCheckinStatus(
  eventId: string,
  enabled: boolean
): Promise<{ success: boolean; checkin_enabled: boolean }> {
  const authApi = await getAuthApi()
  return authApi.patch<{ success: boolean; checkin_enabled: boolean }>(`/events/${eventId}/checkin-status`, {
    enabled,
  })
}

export async function deleteEventCheckin(
  eventId: string,
  checkinId: string
): Promise<{ success: boolean; message: string }> {
  const authApi = await getAuthApi()
  return authApi.delete<{ success: boolean; message: string }>(`/events/${eventId}/checkins/${checkinId}`)
}

/**
 * Limpa todos os check-ins do evento para testes.
 */
export async function resetEventCheckins(eventId: string): Promise<{ success: boolean; message: string; restoredCount: number }> {
  const authApi = await getAuthApi()
  return authApi.delete<{ success: boolean; message: string; restoredCount: number }>(`/events/${eventId}/checkins`)
}



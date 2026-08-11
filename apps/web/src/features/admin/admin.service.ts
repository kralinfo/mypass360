import { api } from '@/lib/api'
import type {
  AdminDashboardData,
  AdminEventItem,
  AdminUserItem,
  EventStatus,
} from '@mypass360/types'

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
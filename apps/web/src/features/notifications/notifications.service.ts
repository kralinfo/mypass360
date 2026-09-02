import { apiWithAuth } from '@/lib/api'
import type { Notification } from '@mypass360/types'

/**
 * Busca a lista de notificações do usuário autenticado.
 */
export async function fetchNotifications(token: string, limit = 50): Promise<Notification[]> {
  return apiWithAuth(token).get<Notification[]>(`/notifications?limit=${limit}`)
}

/**
 * Busca a contagem de notificações não lidas.
 */
export async function fetchUnreadCount(token: string): Promise<{ count: number }> {
  const count = await apiWithAuth(token).get<number>('/notifications/unread-count')
  return { count }
}

/**
 * Marca uma notificação como lida.
 */
export async function markNotificationAsRead(id: string, token: string): Promise<Notification> {
  return apiWithAuth(token).patch<Notification>(`/notifications/${id}/read`, {})
}

/**
 * Marca todas as notificações como lidas.
 */
export async function markAllNotificationsAsRead(token: string): Promise<{ updatedCount: number }> {
  return apiWithAuth(token).patch<{ updatedCount: number }>('/notifications/read-all', {})
}

/**
 * Exclui todas as notificações do usuário.
 */
export async function clearAllNotifications(token: string): Promise<{ success: boolean }> {
  return apiWithAuth(token).delete<{ success: boolean }>('/notifications/clear-all')
}

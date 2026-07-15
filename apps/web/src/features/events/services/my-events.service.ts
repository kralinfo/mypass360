import { apiWithAuth } from '@/lib/api'
import type { Event } from '@mypass360/types'

/**
 * Busca todos os eventos do usuário autenticado.
 * Inclui eventos em qualquer status (draft, publicado, agendado).
 */
export async function fetchMyEvents(token: string): Promise<Event[]> {
  return apiWithAuth(token).get<Event[]>('/events/my')
}

/**
 * Publica o evento imediatamente.
 * Define status = 'published' e published_at = null.
 */
export async function publishEvent(id: string, token: string): Promise<Event> {
  return apiWithAuth(token).patch<Event>(`/events/${id}/publish`, {})
}

/**
 * Oculta o evento (volta para draft).
 * Define status = 'draft' e published_at = null.
 */
export async function unpublishEvent(id: string, token: string): Promise<Event> {
  return apiWithAuth(token).patch<Event>(`/events/${id}/unpublish`, {})
}

/**
 * Agenda a publicação do evento para uma data futura.
 * Define status = 'published' e published_at = data informada.
 *
 * @param publishedAt - Data/hora ISO 8601 (ex: "2026-09-20T18:00:00.000Z")
 */
export async function scheduleEventPublication(
  id: string,
  token: string,
  publishedAt: string
): Promise<Event> {
  return apiWithAuth(token).patch<Event>(`/events/${id}/schedule`, { published_at: publishedAt })
}

/**
 * Cria um novo evento (autenticado).
 */
export async function createEvent(token: string, data: Record<string, unknown>): Promise<Event> {
  return apiWithAuth(token).post<Event>('/events', data)
}

/**
 * Atualiza um evento existente (autenticado).
 */
export async function updateEvent(
  id: string,
  token: string,
  data: Record<string, unknown>
): Promise<Event> {
  return apiWithAuth(token).patch<Event>(`/events/${id}`, data)
}

/**
 * Busca um evento por ID para preenchimento do formulário de edição.
 */
export async function fetchEventById(id: string, token: string): Promise<Event> {
  return apiWithAuth(token).get<Event>(`/events/by-id/${id}`)
}

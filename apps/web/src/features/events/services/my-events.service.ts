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
 * EXIGE que o evento tenha sido aprovado pelo administrador.
 */
export async function publishEvent(id: string, token: string): Promise<Event> {
  return apiWithAuth(token).patch<Event>(`/events/${id}/publish`, {})
}

/**
 * Oculta o evento (volta para draft).
 * Define status = 'draft' e published_at = null.
 * Não altera o approval_status.
 */
export async function unpublishEvent(id: string, token: string): Promise<Event> {
  return apiWithAuth(token).patch<Event>(`/events/${id}/unpublish`, {})
}

/**
 * Solicita aprovação de publicação para o administrador.
 * Só pode ser feito para eventos em draft com approval_status 'none' ou 'rejected'.
 */
export async function requestEventApproval(id: string, token: string): Promise<Event> {
  return apiWithAuth(token).post<Event>(`/events/${id}/request-approval`, {})
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

/**
 * Exclui um evento (autenticado, apenas o proprietário — apenas para rascunhos).
 */
export async function deleteEvent(id: string, token: string): Promise<void> {
  return apiWithAuth(token).delete<void>(`/events/${id}`)
}

/**
 * Solicita a exclusão de um evento publicado ao administrador.
 * Exige justificativa obrigatória.
 */
export async function requestEventDeletion(
  id: string,
  token: string,
  reason: string
): Promise<Event> {
  return apiWithAuth(token).post<Event>(`/events/${id}/request-deletion`, { reason })
}

/**
 * Envia uma resposta do organizador para a mensagem do administrador.
 */
export async function replyAdminMessage(
  id: string,
  token: string,
  replyMessage: string
): Promise<{ success: boolean }> {
  return apiWithAuth(token).post<{ success: boolean }>(`/events/${id}/reply-admin-message`, {
    replyMessage,
  })
}

/**
 * Busca o histórico de mensagens trocadas no evento para o organizador.
 */
export async function fetchEventMessages(
  id: string,
  token: string
): Promise<Array<{ id: string; sender: 'admin' | 'organizer'; senderName: string; message: string; createdAt: string }>> {
  return apiWithAuth(token).get<Array<{ id: string; sender: 'admin' | 'organizer'; senderName: string; message: string; createdAt: string }>>(`/events/${id}/messages`)
}


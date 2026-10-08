import { api, apiWithAuth } from '@/lib/api'
import type { EventCustomField } from '@mypass360/types'

/** Campos ativos do evento (público). */
export function fetchActiveCustomFields(eventId: string): Promise<EventCustomField[]> {
  return api.get<EventCustomField[]>(`/events/${eventId}/custom-fields`)
}

/** Todos os campos, inclusive desativados (dono/sócio). */
export function fetchAllCustomFields(eventId: string, token: string): Promise<EventCustomField[]> {
  return apiWithAuth(token).get<EventCustomField[]>(`/events/${eventId}/custom-fields/all`)
}

export function saveCustomFields(
  eventId: string,
  token: string,
  fields: EventCustomField[]
): Promise<EventCustomField[]> {
  return apiWithAuth(token).put<EventCustomField[]>(`/events/${eventId}/custom-fields`, { fields })
}

/** Retorna a mensagem do primeiro campo obrigatório não preenchido, ou null. */
export function findMissingRequiredField(
  fields: EventCustomField[],
  answers: Record<string, string>
): string | null {
  for (const field of fields) {
    if (field.required && !(answers[field.id ?? ''] ?? '').trim()) {
      return `Preencha o campo "${field.label}".`
    }
  }
  return null
}

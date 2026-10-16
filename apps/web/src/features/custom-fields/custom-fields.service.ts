import { api, apiWithAuth } from '@/lib/api'
import type { CheckinDisplayFieldConfig, EventCustomField } from '@mypass360/types'

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

/** Campos adicionais exibidos no check-in configurados pelo organizador (máx 3). */
export function fetchCheckinDisplayFields(
  eventId: string,
  token: string
): Promise<CheckinDisplayFieldConfig[]> {
  return apiWithAuth(token).get<CheckinDisplayFieldConfig[]>(`/events/${eventId}/checkin-display-fields`)
}

/** Salva lista de campos adicionais exibidos no check-in (máx 3). */
export function saveCheckinDisplayFields(
  eventId: string,
  token: string,
  fieldIds: string[]
): Promise<CheckinDisplayFieldConfig[]> {
  return apiWithAuth(token).put<CheckinDisplayFieldConfig[]>(`/events/${eventId}/checkin-display-fields`, {
    fieldIds,
  })
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

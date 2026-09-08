import { apiWithAuth } from '@/lib/api'
import type {
  Ticket,
  ValidatePasswordPayload,
  ValidatePasswordResponse,
  FreeRegistrationPayload,
} from '@mypass360/types'

export async function validateAccessPassword(
  eventId: string,
  token: string,
  payload: ValidatePasswordPayload
): Promise<ValidatePasswordResponse> {
  return apiWithAuth(token).post<ValidatePasswordResponse>(
    `/events/${eventId}/free-registration/validate-password`,
    payload
  )
}

export async function registerFreeAttendance(
  eventId: string,
  token: string,
  payload: FreeRegistrationPayload
): Promise<Ticket> {
  return apiWithAuth(token).post<Ticket>(`/events/${eventId}/free-registration`, payload)
}

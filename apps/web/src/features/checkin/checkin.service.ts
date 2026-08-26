import { api } from '@/lib/api'
import type {
  CheckinAuthResponse,
  CheckinRecord,
  CheckinValidationResult,
} from '@mypass360/types'

export async function authenticateCheckinAccess(code: string): Promise<CheckinAuthResponse> {
  return api.post<CheckinAuthResponse>('/checkin/auth', { code })
}

export async function validateCheckinTicket(
  ticketId: string,
  accessCode: string
): Promise<CheckinValidationResult> {
  return api.post<CheckinValidationResult>('/checkin/validate', {
    ticketId,
    accessCode,
  })
}

export async function fetchRecentCheckins(accessCode: string): Promise<CheckinRecord[]> {
  return api.get<CheckinRecord[]>(`/checkin/recent?accessCode=${encodeURIComponent(accessCode)}`)
}

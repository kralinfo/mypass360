export interface CheckinAccess {
  id: string
  eventId: string
  name: string
  code: string
  isActive: boolean
  createdAt: string
  lastUsedAt?: string | null
}

export interface CheckinRecord {
  id: string
  eventId: string
  ticketId: string
  publicCode: string
  ticketTypeName: string
  participantName?: string | null
  participantCpf?: string | null
  checkedInAt: string
  operatorName?: string | null
  status: 'CHECKED_IN'
}

export interface CheckinEventInfo {
  id: string
  title: string
  slug: string
  date: string
  location: string
  ticketLayout: 'ticket' | 'formal_pdf'
  participantIdType: 'none' | 'name' | 'name_cpf'
  checkinEnabled?: boolean
  totalTickets: number
  checkedInTickets: number
}


export interface CheckinAuthResponse {
  access: CheckinAccess
  event: CheckinEventInfo
}

export interface CheckinValidationResult {
  valid: boolean
  reason?: string
  ticketId?: string
  publicCode?: string
  ticketTypeName?: string
  participantName?: string | null
  participantCpf?: string | null
  checkedInAt?: string
  firstCheckedInAt?: string
  firstCheckedInBy?: string
  event?: {
    id: string
    title: string
    ticketLayout: 'ticket' | 'formal_pdf'
    participantIdType: 'none' | 'name' | 'name_cpf'
  }
}

export interface CreateCheckinAccessInput {
  name: string
}

export interface UpdateCheckinAccessInput {
  name?: string
  isActive?: boolean
}

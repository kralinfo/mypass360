export type EventPartnerRole = 'OWNER' | 'PARTNER'

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED'

export interface EventInvitation {
  id: string
  event_id: string
  invited_email: string
  invited_user_id?: string | null
  invited_by: string
  token: string
  status: InvitationStatus
  created_at: string
  accepted_at?: string | null
  expires_at?: string | null
  // Metadados adicionais quando carregados via JOIN
  event_title?: string
  inviter_name?: string
}

export interface EventMember {
  id: string
  event_id: string
  user_id: string
  role: EventPartnerRole
  status: 'ACTIVE' | 'REMOVED'
  created_at: string
  user_email?: string
  user_name?: string
}

export interface InvitationDetailsResponse {
  invitation: EventInvitation
  event: {
    id: string
    title: string
    date: string | null
    location: string | null
    banner_url: string | null
    organizer_name: string | null
  }
}

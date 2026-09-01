export type EventStatus = 'draft' | 'published' | 'cancelled' | 'finished'

/** Status visual calculado no frontend a partir dos campos do evento */
export type EventDisplayStatus = 'published' | 'scheduled' | 'hidden'

/** Modelo de ingresso usado pelo evento */
export type TicketLayout = 'ticket' | 'formal_pdf'

/** Tipo de identificação exigida no checkout */
export type ParticipantIdType = 'none' | 'name' | 'name_cpf'

export interface Event {
  id: string
  title: string
  slug: string
  description: string
  date: string
  location: string
  organizer_id: string
  capacity: number
  price: number
  status: EventStatus
  /** Data/hora de publicação agendada. null = publicação imediata ou não agendado. */
  published_at?: string | null
  image_url?: string
  genre?: string | null
  /** Modelo de ingresso do evento. Padrão: 'ticket' (retrocompatível) */
  ticket_layout?: TicketLayout
  /** Tipo de identificação do participante. Aplica-se quando ticket_layout = 'ticket'. Padrão: 'name' */
  participant_id_type?: ParticipantIdType
  /** Indica se a portaria / check-in está aberta/ativa para este evento. Padrão: true */
  checkin_enabled?: boolean
  ticket_types?: Array<{

    id: string
    name: string
    price: number
    quantity: number
    description?: string
  }>
  created_at: string
  updated_at: string
}

/**
 * Calcula o status visual de um evento para exibição na tela "Meus Eventos".
 *
 * - 'published':  status = 'published' E (sem published_at OU published_at já passou)
 * - 'scheduled':  status = 'published' E published_at está no futuro
 * - 'hidden':     qualquer outro status (draft, cancelled, finished)
 */
export function getEventDisplayStatus(event: Event): EventDisplayStatus {
  if (event.status !== 'published') return 'hidden'
  if (event.published_at && new Date(event.published_at) > new Date()) return 'scheduled'
  return 'published'
}

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'finished'

/** Status visual calculado no frontend a partir dos campos do evento */
export type EventDisplayStatus = 'published' | 'scheduled' | 'hidden'

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

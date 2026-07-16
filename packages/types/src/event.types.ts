export type EventStatus = 'draft' | 'published' | 'cancelled' | 'finished'

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
  image_url?: string
  created_at: string
  updated_at: string
}

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'finished'

export interface Event {
  id: string
  title: string
  slug: string
  description: string
  date: string
  location: string
  organizerId: string
  capacity: number
  price: number
  status: EventStatus
  createdAt: string
  updatedAt: string
}

import { api } from '@/lib/api'
import type { Event } from '@mypass360/types'

export async function fetchEvents(): Promise<Event[]> {
  return api.get<Event[]>('/events')
}

export async function fetchEventBySlug(slug: string): Promise<Event> {
  return api.get<Event>(`/events/${slug}`)
}

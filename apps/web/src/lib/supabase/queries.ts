import type { Event } from '@mypass360/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export async function fetchEventsFromApi(): Promise<Event[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/events`, {
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      return []
    }

    return response.json() as Promise<Event[]>
  } catch (error) {
    console.error('Failed to fetch events from API:', error)
    return []
  }
}

export async function fetchEventBySlugFromApi(slug: string): Promise<Event | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/events/${slug}`, {
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      return null
    }

    return response.json() as Promise<Event>
  } catch (error) {
    console.error('Failed to fetch event by slug:', error)
    return null
  }
}

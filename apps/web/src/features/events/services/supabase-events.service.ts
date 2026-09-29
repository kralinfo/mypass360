import type { Event } from '@mypass360/types'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

/** Espelha a lógica do backend: remove o hash e calcula has_password */
function sanitizeEvent(data: Record<string, unknown>): Event {
  const { access_password_hash, ...rest } = data
  return {
    ...rest,
    has_password: Boolean(access_password_hash),
  } as Event
}

export async function fetchPublishedEvents(): Promise<Event[]> {
  try {
    const supabase = createBrowserClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('events')
      .select('*, ticket_types(*)')
      .in('status', ['published', 'finished'])
      .or('visibility.eq.PUBLIC,visibility.is.null')
      .neq('deletion_status', 'pending')
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching events from Supabase:', error.message)
      return []
    }

    return (data ?? []).map((item) => sanitizeEvent(item as Record<string, unknown>))
  } catch (err) {
    const error = err as { message?: string }
    console.error('Failed to fetch events from Supabase (network or configuration error):', error?.message || err)
    return []
  }
}

export async function fetchPublishedEventBySlug(slug: string): Promise<Event | null> {
  try {
    const supabase = createBrowserClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('events')
      .select('*, ticket_types(*)')
      .eq('slug', slug)
      .eq('status', 'published')
      .or(`published_at.is.null,published_at.lte.${now}`)
      .single()

    if (error) {
      console.error('Error fetching event by slug:', error.message)
      return null
    }

    return sanitizeEvent(data as Record<string, unknown>)
  } catch (err) {
    const error = err as { message?: string }
    console.error('Failed to fetch event by slug from Supabase (network or configuration error):', error?.message || err)
    return null
  }
}

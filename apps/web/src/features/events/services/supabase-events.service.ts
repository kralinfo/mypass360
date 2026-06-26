import type { Event } from '@mypass360/types'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

export async function fetchPublishedEvents(): Promise<Event[]> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'published')
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching events from Supabase:', error.message)
    return []
  }

  return (data ?? []) as Event[]
}

export async function fetchPublishedEventBySlug(slug: string): Promise<Event | null> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error) {
    console.error('Error fetching event by slug:', error.message)
    return null
  }

  return data as Event
}

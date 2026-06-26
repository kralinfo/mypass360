'use client'

import { useEffect, useState } from 'react'
import type { Event } from '@mypass360/types'
import { fetchPublishedEvents } from '../services/supabase-events.service'

interface UseSupabaseEventsResult {
  events: Event[]
  isLoading: boolean
  error: string | null
}

export function useSupabaseEvents(): UseSupabaseEventsResult {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    fetchPublishedEvents()
      .then((data) => {
        if (isMounted) {
          setEvents(data)
          if (data.length === 0) {
            setError('Nenhum evento publicado encontrado. Adicione dados no Supabase.')
          }
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar eventos')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return { events, isLoading, error }
}

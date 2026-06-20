'use client'

import { useEffect, useState } from 'react'
import type { Event } from '@app-ingresso/types'
import { fetchEvents } from '../services/events.service'

interface UseEventsResult {
  events: Event[]
  isLoading: boolean
  error: string | null
}

export function useEvents(): UseEventsResult {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEvents()
      .then(setEvents)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar eventos')
      })
      .finally(() => setIsLoading(false))
  }, [])

  return { events, isLoading, error }
}

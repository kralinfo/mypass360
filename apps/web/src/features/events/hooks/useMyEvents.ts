'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Event } from '@mypass360/types'
import { createClient } from '@/lib/supabase/client'
import { fetchMyEvents } from '../services/my-events.service'

interface UseMyEventsResult {
  events: Event[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useMyEvents(): UseMyEventsResult {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trigger, setTrigger] = useState(0)

  const refetch = useCallback(() => setTrigger((n) => n + 1), [])

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          if (isMounted) setError('Usuário não autenticado')
          return
        }

        const data = await fetchMyEvents(session.access_token)

        if (isMounted) setEvents(data)
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar seus eventos')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [trigger])

  return { events, isLoading, error, refetch }
}

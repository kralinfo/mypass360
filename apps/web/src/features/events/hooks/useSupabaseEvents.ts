'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Event } from '@mypass360/types'
import { fetchPublishedEvents } from '../services/supabase-events.service'
import { useRealtimeSyncHandler } from '@/features/notifications/useRealtimeSyncHandler'
import { createClient } from '@/lib/supabase/client'

interface UseSupabaseEventsResult {
  events: Event[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useSupabaseEvents(): UseSupabaseEventsResult {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    try {
      const data = await fetchPublishedEvents()
      setEvents(data)
      if (data.length === 0) {
        setError('Nenhum evento publicado encontrado.')
      } else {
        setError(null)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar eventos')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  // 1. Sincronização via Event Bus de notificações (RealtimeSyncContext)
  useRealtimeSyncHandler('public_events', 'useSupabaseEvents', () => {
    void loadEvents()
  })

  // 2. Inscrição direta no Supabase Realtime (postgres_changes na tabela events)
  // Atualiza instantaneamente a tela de eventos públicos mesmo para visitantes não logados
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('public-events-live-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        () => {
          void loadEvents()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadEvents])

  return { events, isLoading, error, refetch: loadEvents }
}

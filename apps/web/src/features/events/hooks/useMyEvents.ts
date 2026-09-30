'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Event } from '@mypass360/types'
import { createClient } from '@/lib/supabase/client'
import { fetchMyEvents } from '../services/my-events.service'
import { useRealtimeSyncHandler } from '@/features/notifications/useRealtimeSyncHandler'

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

  // Referência estável para o refetch — evita que o handler registrado
  // seja recriado a cada render, o que causaria limpeza/registro contínuo.
  const refetchRef = useRef(refetch)
  refetchRef.current = refetch

  useEffect(() => {
    let isMounted = true

    async function load() {
      if (events.length === 0) {
        setIsLoading(true)
      }
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

  /**
   * Registra este hook como handler de sincronização para eventos do organizador.
   * Quando uma notificação relevante chegar (aprovação, rejeição, publicação, etc.),
   * o refetch será disparado automaticamente via RealtimeSyncContext.
   */
  useRealtimeSyncHandler('my_events', 'useMyEvents', () => {
    refetchRef.current()
  })

  /**
   * Inscrição direta no Supabase Realtime (postgres_changes na tabela events para o organizador)
   * Garante atualização em tempo real na tela "Meus Eventos" quando o admin altera o status.
   */
  useEffect(() => {
    const supabase = createClient()
    let activeChannel: ReturnType<typeof supabase.channel> | null = null
    let isCancelled = false

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isCancelled || !session?.user?.id) return

      const channelName = `my-events-live-${session.user.id}-${Date.now()}`
      activeChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'events',
            filter: `organizer_id=eq.${session.user.id}`,
          },
          () => {
            refetchRef.current()
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'event_members',
            filter: `user_id=eq.${session.user.id}`,
          },
          () => {
            refetchRef.current()
          }
        )
        .subscribe()
    })

    return () => {
      isCancelled = true
      if (activeChannel) {
        void supabase.removeChannel(activeChannel)
      }
    }
  }, [])

  return { events, isLoading, error, refetch }
}

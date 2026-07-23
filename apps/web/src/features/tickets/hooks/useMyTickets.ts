'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchMyTickets } from '../services/tickets.service'
import type { Ticket } from '@mypass360/types'

interface UseMyTicketsResult {
  tickets: Ticket[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useMyTickets(): UseMyTicketsResult {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trigger, setTrigger] = useState(0)

  const refetch = useCallback(() => {
    setTrigger((prev) => prev + 1)
  }, [])

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.access_token) {
          if (isMounted) setError('Você precisa estar logado para ver seus ingressos.')
          return
        }

        const data = await fetchMyTickets(session.access_token)
        if (isMounted) setTickets(data)
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar ingressos.')
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

  return { tickets, isLoading, error, refetch }
}

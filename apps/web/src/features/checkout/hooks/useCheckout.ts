'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  fetchCheckoutData,
  processCheckout,
  type CheckoutTicketType,
} from '../services/checkout.service'
import type { Event } from '@mypass360/types'

interface SelectedTicketType {
  ticketTypeId: string
  quantity: number
  unitPrice: number
}

interface UseCheckoutResult {
  event: Event | null
  ticketTypes: CheckoutTicketType[]
  selectedItems: SelectedTicketType[]
  total: number
  isLoading: boolean
  isSubmitting: boolean
  error: string | null
  loadCheckout: (eventId: string) => Promise<void>
  setTicketQuantity: (ticketType: CheckoutTicketType, quantity: number) => void
  handleSubmit: (eventId: string) => Promise<{ orderId: string; amount: number } | null>
}

export function useCheckout(): UseCheckoutResult {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [event, setEvent] = useState<Event | null>(null)
  const [ticketTypes, setTicketTypes] = useState<CheckoutTicketType[]>([])
  const [selectedItems, setSelectedItems] = useState<SelectedTicketType[]>([])

  const total = selectedItems.reduce(
    (accumulator, item) => accumulator + item.quantity * item.unitPrice,
    0
  )

  const loadCheckout = useCallback(async (eventId: string): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchCheckoutData(eventId)
      setEvent(data.event)
      setTicketTypes(data.ticketTypes)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar checkout')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const setTicketQuantity = useCallback((ticketType: CheckoutTicketType, quantity: number): void => {
    if (quantity < 0) return

    setSelectedItems((previous) => {
      const withoutCurrent = previous.filter((item) => item.ticketTypeId !== ticketType.id)

      if (quantity === 0) {
        return withoutCurrent
      }

      return [
        ...withoutCurrent,
        {
          ticketTypeId: ticketType.id,
          quantity,
          unitPrice: ticketType.price,
        },
      ]
    })
  }, [])

  const handleSubmit = useCallback(async (eventId: string): Promise<{ orderId: string; amount: number } | null> => {
    if (selectedItems.length === 0) {
      setError('Selecione ao menos um ingresso para continuar.')
      return null
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('Você precisa estar logado para finalizar a compra.')
        return null
      }

      const order = await processCheckout({
        eventId,
        userId: user.id,
        items: selectedItems,
      })

      return { orderId: order.id, amount: total }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao processar checkout')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [selectedItems, total])

  return {
    event,
    ticketTypes,
    selectedItems,
    total,
    isLoading,
    isSubmitting,
    error,
    loadCheckout,
    setTicketQuantity,
    handleSubmit,
  }
}

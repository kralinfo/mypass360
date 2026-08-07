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
  nomineeNames?: string[]
  nomineeCpfs?: string[]
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
  hydrateSelectedItems: (items: SelectedTicketType[]) => void
  updateNomineeName: (ticketTypeId: string, index: number, name: string) => void
  updateNomineeCpf: (ticketTypeId: string, index: number, cpf: string) => void
  handleSubmit: (eventId: string) => Promise<{ orderId: string; amount: number } | null>
}

export function useCheckout(): UseCheckoutResult {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [event, setEvent] = useState<Event | null>(null)
  const [ticketTypes, setTicketTypes] = useState<CheckoutTicketType[]>([])
  const [selectedItems, setSelectedItemsState] = useState<SelectedTicketType[]>([])

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

    setSelectedItemsState((previous) => {
      const withoutCurrent = previous.filter((item) => item.ticketTypeId !== ticketType.id)

      if (quantity === 0) {
        return withoutCurrent
      }

      const existingItem = previous.find((item) => item.ticketTypeId === ticketType.id)
      const existingNames = existingItem?.nomineeNames ?? []
      const existingCpfs = existingItem?.nomineeCpfs ?? []
      const newNames = Array.from({ length: quantity }, (_, idx) => existingNames[idx] ?? '')
      const newCpfs = Array.from({ length: quantity }, (_, idx) => existingCpfs[idx] ?? '')

      return [
        ...withoutCurrent,
        {
          ticketTypeId: ticketType.id,
          quantity,
          unitPrice: ticketType.price,
          nomineeNames: newNames,
          nomineeCpfs: newCpfs,
        },
      ]
    })
  }, [])

  const updateNomineeName = useCallback((ticketTypeId: string, index: number, name: string): void => {
    setSelectedItemsState((previous) =>
      previous.map((item) => {
        if (item.ticketTypeId !== ticketTypeId) return item
        const newNames = [...(item.nomineeNames ?? [])]
        newNames[index] = name
        return { ...item, nomineeNames: newNames }
      })
    )
  }, [])

  const updateNomineeCpf = useCallback((ticketTypeId: string, index: number, cpf: string): void => {
    setSelectedItemsState((previous) =>
      previous.map((item) => {
        if (item.ticketTypeId !== ticketTypeId) return item
        const newCpfs = [...(item.nomineeCpfs ?? [])]
        newCpfs[index] = cpf
        return { ...item, nomineeCpfs: newCpfs }
      })
    )
  }, [])

  const hydrateSelectedItems = useCallback((items: SelectedTicketType[]): void => {
    const itemsWithNames = items.map((item) => ({
      ...item,
      nomineeNames: item.nomineeNames ?? Array.from({ length: item.quantity }, () => ''),
      nomineeCpfs: item.nomineeCpfs ?? Array.from({ length: item.quantity }, () => ''),
    }))
    setSelectedItemsState(itemsWithNames)
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
    hydrateSelectedItems,
    updateNomineeName,
    updateNomineeCpf,
    handleSubmit,
  }
}

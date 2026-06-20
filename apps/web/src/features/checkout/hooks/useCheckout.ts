'use client'

import { useState } from 'react'
import type { CreateOrderInput } from '@app-ingresso/types'
import { processCheckout } from '../services/checkout.service'

interface UseCheckoutResult {
  isLoading: boolean
  error: string | null
  handleSubmit: (data: CreateOrderInput) => Promise<void>
}

export function useCheckout(): UseCheckoutResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(data: CreateOrderInput): Promise<void> {
    setIsLoading(true)
    setError(null)

    try {
      await processCheckout(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao processar checkout')
    } finally {
      setIsLoading(false)
    }
  }

  return { isLoading, error, handleSubmit }
}

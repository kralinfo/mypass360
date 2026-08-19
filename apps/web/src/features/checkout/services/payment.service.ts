import { api } from '@/lib/api'
import type { CreatePaymentInput, Payment } from '@mypass360/types'

export interface CreateCheckoutPreferenceInput {
  orderId: string
  amount: number
  payerEmail: string
  title?: string
  payerDocument?: string
}

export interface CheckoutPreferenceResult {
  preferenceId: string
  initPoint: string
}

export async function createPixPayment(data: CreatePaymentInput): Promise<Payment> {
  return api.post<Payment>('/payments', data)
}

export async function createCheckoutPreference(
  data: CreateCheckoutPreferenceInput
): Promise<CheckoutPreferenceResult> {
  return api.post<CheckoutPreferenceResult>('/payments/preference', data)
}

export async function fetchPaymentById(paymentId: string): Promise<Payment> {
  return api.get<Payment>(`/payments/${paymentId}`)
}

export async function fetchPaymentByOrderId(orderId: string): Promise<Payment | null> {
  try {
    return await api.get<Payment>(`/payments/by-order/${orderId}`)
  } catch {
    return null
  }
}

export async function confirmPayment(paymentId: string): Promise<Payment> {
  return api.post<Payment>(`/payments/${paymentId}/confirm`, {})
}

/**
 * Confirmação manual de pagamento para ambiente de desenvolvimento.
 * Envia o código "mypass360pg" para simular pagamento aprovado e gerar ingressos.
 *
 * TODO: Remover quando a integração oficial do Mercado Pago estiver concluída.
 */
export async function manualConfirmPayment(orderId: string, code: string): Promise<Payment> {
  // TODO: Remover quando a integração oficial do Mercado Pago estiver concluída.
  return api.post<Payment>('/payments/manual-confirmation', { orderId, code })
}

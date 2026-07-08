import { api } from '@/lib/api'
import type { CreatePaymentInput, Payment } from '@mypass360/types'

export async function createPixPayment(data: CreatePaymentInput): Promise<Payment> {
  return api.post<Payment>('/payments', data)
}

export async function fetchPaymentById(paymentId: string): Promise<Payment> {
  return api.get<Payment>(`/payments/${paymentId}`)
}

export async function confirmPayment(paymentId: string): Promise<Payment> {
  return api.post<Payment>(`/payments/${paymentId}/confirm`, {})
}
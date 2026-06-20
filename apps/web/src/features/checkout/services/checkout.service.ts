import { api } from '@/lib/api'
import type { CreateOrderInput, Order } from '@app-ingresso/types'

export async function processCheckout(data: CreateOrderInput): Promise<Order> {
  return api.post<Order>('/orders', data)
}

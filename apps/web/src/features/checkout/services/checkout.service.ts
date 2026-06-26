import { api } from '@/lib/api'
import type { CreateOrderInput, Order } from '@mypass360/types'

export async function processCheckout(data: CreateOrderInput): Promise<Order> {
  return api.post<Order>('/orders', data)
}

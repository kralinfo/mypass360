export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'refunded'

export interface OrderItem {
  id: string
  orderId: string
  ticketTypeId: string
  quantity: number
  unitPrice: number
  nomineeNames?: string[]
  nomineeCpfs?: string[]
}

export interface Order {
  id: string
  eventId: string
  userId: string
  status: OrderStatus
  total: number
  items: OrderItem[]
  createdAt: string
  updatedAt: string
}

export interface CreateOrderInput {
  eventId: string
  items: Array<{ ticketTypeId: string; quantity: number; nomineeNames?: string[]; nomineeCpfs?: string[] }>
}

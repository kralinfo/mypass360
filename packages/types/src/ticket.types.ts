export type TicketStatus = 'active' | 'used' | 'cancelled'

export interface Ticket {
  id: string
  orderId: string
  eventId: string
  userId: string
  qrCode: string
  status: TicketStatus
  usedAt?: string
  createdAt: string
}

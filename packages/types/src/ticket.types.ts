export type TicketStatus = 'PENDING' | 'VALID' | 'CHECKED_IN' | 'CANCELED'

export interface Ticket {
  id: string
  publicCode: string
  orderId: string
  orderItemId?: string
  eventId: string
  ticketTypeId?: string
  userId: string
  buyerName?: string
  buyerEmail?: string
  qrCode: string
  status: TicketStatus
  issuedAt?: string
  checkedInAt?: string
  checkedInBy?: string
  validationToken?: string
  createdAt: string
  // Relações (quando expandido via JOIN)
  event?: {
    id: string
    title: string
    date: string
    location: string
    slug: string
    imageUrl?: string
  }
  ticketType?: {
    id: string
    name: string
    price: number
    description?: string
  }
}

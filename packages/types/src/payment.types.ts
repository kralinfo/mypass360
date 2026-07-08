export type PaymentProvider = 'pix' | 'credit_card' | 'boleto'

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded'

export interface Payment {
  id: string
  orderId: string
  provider: PaymentProvider
  amount: number
  status: PaymentStatus
  externalId?: string
  pixCode?: string
  pixExpiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface CreatePaymentInput {
  orderId: string
  provider: PaymentProvider
  amount: number
  externalId?: string
}
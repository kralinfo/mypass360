import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import type { Event, Order } from '@mypass360/types'

export interface CheckoutTicketType {
  id: string
  event_id: string
  name: string
  price: number
  quantity: number
  sold: number
}

export interface CheckoutData {
  event: Event
  ticketTypes: CheckoutTicketType[]
}

export interface CreateCheckoutOrderInput {
  eventId: string
  userId: string
  items: Array<{ ticketTypeId: string; quantity: number; unitPrice: number }>
}

export async function fetchCheckoutData(eventId: string): Promise<CheckoutData> {
  const supabase = createClient()

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('status', 'published')
    .single()

  if (eventError || !event) {
    throw new Error('Evento não encontrado para checkout.')
  }

  const { data: ticketTypes, error: ticketTypesError } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('event_id', eventId)
    .order('price', { ascending: true })

  if (ticketTypesError) {
    throw new Error('Não foi possível carregar os tipos de ingresso.')
  }

  return {
    event: event as Event,
    ticketTypes: (ticketTypes ?? []) as CheckoutTicketType[],
  }
}

export async function processCheckout(data: CreateCheckoutOrderInput): Promise<Order> {
  return api.post<Order>('/orders', data)
}

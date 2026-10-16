import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import type { Event, Order } from '@mypass360/types'

export interface CheckoutTicketType {
  id: string
  event_id: string
  name: string
  price: number
  quantity: number
  is_unlimited?: boolean
  sold: number
  description?: string | null
  batch_mode?: boolean
  batch_name?: string
}

export interface CheckoutData {
  event: Event
  ticketTypes: CheckoutTicketType[]
}

export interface CreateCheckoutOrderInput {
  eventId: string
  userId: string
  items: Array<{ ticketTypeId: string; quantity: number; unitPrice: number; nomineeNames?: string[]; nomineeCpfs?: string[]; customAnswers?: Record<string, string>[] }>
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

  const rawTicketTypes = (ticketTypes ?? []) as Array<CheckoutTicketType & { batch_mode?: boolean }>
  const batchTypeIds = rawTicketTypes.filter((tt) => tt.batch_mode).map((tt) => tt.id)

  const activeBatchesMap: Record<
    string,
    { price: number; quantity: number; sold: number; is_unlimited: boolean; name: string }
  > = {}

  if (batchTypeIds.length > 0) {
    const { data: batches } = await supabase
      .from('ticket_batches')
      .select('ticket_type_id, price, quantity, sold, reserved, is_unlimited, name, status, display_order')
      .in('ticket_type_id', batchTypeIds)
      .order('display_order', { ascending: true })

    if (batches) {
      // Primeiro atribuir lotes abertos
      for (const b of batches) {
        if (b.status === 'open' && !activeBatchesMap[b.ticket_type_id]) {
          activeBatchesMap[b.ticket_type_id] = {
            price: Number(b.price),
            quantity: b.quantity,
            sold: (b.sold ?? 0) + (b.reserved ?? 0),
            is_unlimited: b.is_unlimited,
            name: b.name,
          }
        }
      }
      // Se algum tipo não tiver lote 'open', usar o primeiro lote futuro disponível
      for (const b of batches) {
        if (!activeBatchesMap[b.ticket_type_id] && b.status === 'future') {
          activeBatchesMap[b.ticket_type_id] = {
            price: Number(b.price),
            quantity: b.quantity,
            sold: (b.sold ?? 0) + (b.reserved ?? 0),
            is_unlimited: b.is_unlimited,
            name: b.name,
          }
        }
      }
    }
  }

  const enrichedTicketTypes: CheckoutTicketType[] = rawTicketTypes.map((tt) => {
    const activeBatch = activeBatchesMap[tt.id]
    if (tt.batch_mode && activeBatch) {
      return {
        ...tt,
        price: activeBatch.price,
        quantity: activeBatch.quantity,
        sold: activeBatch.sold,
        is_unlimited: activeBatch.is_unlimited,
        batch_name: activeBatch.name,
      }
    }
    return tt
  })

  return {
    event: event as Event,
    ticketTypes: enrichedTicketTypes,
  }
}

export async function processCheckout(data: CreateCheckoutOrderInput): Promise<Order> {
  return api.post<Order>('/orders', data)
}

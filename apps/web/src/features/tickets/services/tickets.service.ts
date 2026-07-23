import { apiWithAuth } from '@/lib/api'
import type { Ticket } from '@mypass360/types'

/**
 * Normaliza a resposta do backend (snake_case) para o formato esperado (camelCase).
 * O Supabase retorna campos em snake_case e precisamos mapear para o tipo Ticket.
 */
function normalizeTicket(raw: any): Ticket {
  return {
    id: raw.id,
    publicCode: raw.public_code ?? raw.publicCode ?? '',
    orderId: raw.order_id ?? raw.orderId ?? '',
    orderItemId: raw.order_item_id ?? raw.orderItemId,
    eventId: raw.event_id ?? raw.eventId ?? '',
    ticketTypeId: raw.ticket_type_id ?? raw.ticketTypeId,
    userId: raw.user_id ?? raw.userId ?? '',
    buyerName: raw.buyer_name ?? raw.buyerName,
    buyerEmail: raw.buyer_email ?? raw.buyerEmail,
    qrCode: raw.qr_code ?? raw.qrCode ?? '',
    status: raw.status ?? 'VALID',
    issuedAt: raw.issued_at ?? raw.issuedAt,
    checkedInAt: raw.checked_in_at ?? raw.checkedInAt,
    checkedInBy: raw.checked_in_by ?? raw.checkedInBy,
    validationToken: raw.validation_token ?? raw.validationToken,
    createdAt: raw.created_at ?? raw.createdAt ?? '',
    // Relações enriquecidas pelo backend
    event: raw.event
      ? {
          id: raw.event.id,
          title: raw.event.title,
          date: raw.event.date,
          location: raw.event.location,
          slug: raw.event.slug,
          imageUrl: raw.event.image_url ?? raw.event.imageUrl,
        }
      : undefined,
    ticketType: raw.ticketType ?? raw.ticket_type
      ? {
          id: (raw.ticketType ?? raw.ticket_type).id,
          name: (raw.ticketType ?? raw.ticket_type).name,
          price: (raw.ticketType ?? raw.ticket_type).price,
          description: (raw.ticketType ?? raw.ticket_type).description,
        }
      : undefined,
  }
}

/**
 * Busca todos os tickets do usuário autenticado.
 * O backend valida ownership — apenas tickets do próprio usuário são retornados.
 */
export async function fetchMyTickets(token: string): Promise<Ticket[]> {
  const raw = await apiWithAuth(token).get<any[]>('/tickets/my')
  return Array.isArray(raw) ? raw.map(normalizeTicket) : []
}

/**
 * Busca um ticket específico do usuário autenticado.
 * O backend valida ownership — retorna 404 se não for do usuário.
 */
export async function fetchTicketById(id: string, token: string): Promise<Ticket> {
  const raw = await apiWithAuth(token).get<any>(`/tickets/${id}`)
  return normalizeTicket(raw)
}

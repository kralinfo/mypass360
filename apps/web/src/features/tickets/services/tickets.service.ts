import { apiWithAuth } from '@/lib/api'
import type { Ticket } from '@mypass360/types'

/**
 * Normaliza a resposta do backend (snake_case) para o formato esperado (camelCase).
 * O Supabase retorna campos em snake_case e precisamos mapear para o tipo Ticket.
 */
interface RawTicket {
  id: string
  public_code?: string
  publicCode?: string
  order_id?: string
  orderId?: string
  order_item_id?: string
  orderItemId?: string
  event_id?: string
  eventId?: string
  ticket_type_id?: string
  ticketTypeId?: string
  user_id?: string
  userId?: string
  buyer_name?: string
  buyerName?: string
  buyer_email?: string
  buyerEmail?: string
  buyer_cpf?: string
  buyerCpf?: string
  qr_code?: string
  qrCode?: string
  status?: Ticket['status']
  issued_at?: string
  issuedAt?: string
  checked_in_at?: string
  checkedInAt?: string
  checked_in_by?: string
  checkedInBy?: string
  validation_token?: string
  validationToken?: string
  created_at?: string
  createdAt?: string
  event?: {
    id: string
    title: string
    date: string
    location: string
    slug: string
    image_url?: string
    imageUrl?: string
    ticket_layout?: 'ticket' | 'formal_pdf'
    participant_id_type?: 'none' | 'name' | 'name_cpf'
  }
  ticketType?: {
    id: string
    name: string
    price: number
    description?: string
  }
  ticket_type?: {
    id: string
    name: string
    price: number
    description?: string
  }
}

/**
 * Normaliza a resposta do backend (snake_case) para o formato esperado (camelCase).
 * O Supabase retorna campos em snake_case e precisamos mapear para o tipo Ticket.
 */
function normalizeTicket(raw: RawTicket): Ticket {
  const rawTicketType = raw.ticketType ?? raw.ticket_type
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
    buyerCpf: raw.buyer_cpf ?? raw.buyerCpf,
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
          ticket_layout: raw.event.ticket_layout,
          participant_id_type: raw.event.participant_id_type,
        }
      : undefined,
    ticketType: rawTicketType
      ? {
          id: rawTicketType.id,
          name: rawTicketType.name,
          price: rawTicketType.price,
          description: rawTicketType.description,
        }
      : undefined,
  }
}

/**
 * Busca todos os tickets do usuário autenticado.
 * O backend valida ownership — apenas tickets do próprio usuário são retornados.
 */
export async function fetchMyTickets(token: string): Promise<Ticket[]> {
  const raw = await apiWithAuth(token).get<RawTicket[]>('/tickets/my')
  return Array.isArray(raw) ? raw.map(normalizeTicket) : []
}

/**
 * Busca um ticket específico do usuário autenticado.
 * O backend valida ownership — retorna 404 se não for do usuário.
 */
export async function fetchTicketById(id: string, token: string): Promise<Ticket> {
  const raw = await apiWithAuth(token).get<RawTicket>(`/tickets/${id}`)
  return normalizeTicket(raw)
}

/**
 * Atualiza o nome do portador de um ingresso (apenas modelo Ticket).
 */
export async function updateTicketBuyerName(
  ticketId: string,
  newName: string,
  token: string
): Promise<{ success: boolean }> {
  return apiWithAuth(token).patch<{ success: boolean }>(`/tickets/${ticketId}/buyer-name`, { buyerName: newName })
}

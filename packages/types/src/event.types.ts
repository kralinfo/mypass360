export type EventStatus = 'draft' | 'published' | 'cancelled' | 'finished'

/**
 * Estado de aprovação do evento para publicação.
 * - 'none':     rascunho inicial, nenhuma solicitação feita
 * - 'pending':  solicitação enviada, aguardando análise do admin
 * - 'approved': aprovado pelo admin, organizador pode publicar
 * - 'rejected': reprovado pelo admin, organizador pode solicitar novamente
 */
export type ApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected'

/**
 * Estado de solicitação de exclusão do evento.
 * - 'none':     nenhuma solicitação de exclusão
 * - 'pending':  organizador solicitou exclusão, aguardando análise do admin
 * - 'approved': exclusão aprovada (evento arquivado/desativado)
 * - 'rejected': solicitação de exclusão rejeitada pelo admin
 */
export type DeletionStatus = 'none' | 'pending' | 'approved' | 'rejected'

/**
 * Status visual calculado no frontend a partir dos campos do evento.
 * Representa o estado completo do ciclo de vida para exibição na UI.
 */
export type EventDisplayStatus =
  | 'draft'            // Rascunho sem aprovação solicitada
  | 'pending_approval' // Aguardando análise de publicação pelo admin
  | 'approved'         // Aprovado, pronto para publicar
  | 'rejected'         // Reprovado pelo administrador
  | 'published'        // Publicado e visível ao público
  | 'scheduled'        // Publicado com data futura agendada
  | 'deletion_pending' // Solicitação de exclusão em análise pelo admin
  | 'deletion_approved'// Exclusão aprovada (Indisponível permanente)
  | 'hidden'           // Oculto (cancelled / finished)

/** Modelo de ingresso usado pelo evento */
export type TicketLayout = 'ticket' | 'formal_pdf'

/** Tipo de identificação exigida no checkout */
export type ParticipantIdType = 'none' | 'name' | 'name_cpf'

export interface Event {
  id: string
  title: string
  slug: string
  description: string
  date: string
  location: string
  organizer_id: string
  capacity: number
  price: number
  status: EventStatus
  /** Data/hora de publicação agendada. null = publicação imediata ou não agendado. */
  published_at?: string | null
  image_url?: string
  genre?: string | null
  /** Modelo de ingresso do evento. Padrão: 'ticket' (retrocompatível) */
  ticket_layout?: TicketLayout
  /** Tipo de identificação do participante. Aplica-se quando ticket_layout = 'ticket'. Padrão: 'name' */
  participant_id_type?: ParticipantIdType
  /** Indica se a portaria / check-in está aberta/ativa para este evento. Padrão: true */
  checkin_enabled?: boolean
  /** Estado de aprovação editorial do evento */
  approval_status?: ApprovalStatus
  /** Data/hora em que o organizador solicitou a publicação */
  approval_requested_at?: string | null
  /** Data/hora em que o admin tomou a decisão de publicação */
  approval_reviewed_at?: string | null
  /** UUID do admin que analisou */
  approved_by?: string | null
  /** Justificativa da rejeição de publicação */
  approval_rejection_reason?: string | null
  /** Estado da solicitação de exclusão do evento */
  deletion_status?: DeletionStatus
  /** Data/hora em que a exclusão foi solicitada */
  deletion_requested_at?: string | null
  /** Motivo da solicitação de exclusão fornecido pelo organizador */
  deletion_reason?: string | null
  /** Data/hora da revisão da exclusão */
  deletion_reviewed_at?: string | null
  /** UUID do admin que revisou a exclusão */
  deletion_reviewed_by?: string | null
  /** Justificativa de rejeição da exclusão */
  deletion_rejection_reason?: string | null
  ticket_types?: Array<{
    id: string
    name: string
    price: number
    quantity: number
    description?: string
  }>
  created_at: string
  updated_at: string
}

/**
 * Calcula o status visual completo de um evento para exibição na UI.
 *
 * Ordem de precedência:
 * 1. deletion_pending — solicitação de exclusão em análise pelo admin
 * 2. published (com ou sem agendamento) — visível ao público
 * 3. approved — aprovado, aguardando o organizador publicar
 * 4. pending_approval — em análise de publicação pelo administrador
 * 5. rejected — reprovado, organizador pode solicitar novamente
 * 6. draft — rascunho sem solicitação
 * 7. hidden — cancelado / encerrado
 */
export function getEventDisplayStatus(event: Event): EventDisplayStatus {
  // Exclusão aprovada pelo admin = Indisponível permanente
  if (event.deletion_status === 'approved') {
    return 'deletion_approved'
  }

  // Solicitação de exclusão pendente
  if (event.deletion_status === 'pending') {
    return 'deletion_pending'
  }

  // Evento publicado — verificar se está agendado ou ao vivo
  if (event.status === 'published') {
    if (event.published_at && new Date(event.published_at) > new Date()) return 'scheduled'
    return 'published'
  }

  // Eventos cancelled/finished → oculto
  if (event.status === 'cancelled' || event.status === 'finished') return 'hidden'

  // Para status = 'draft', o sub-estado é determinado pelo approval_status
  const approval = event.approval_status ?? 'none'

  switch (approval) {
    case 'pending':
      return 'pending_approval'
    case 'approved':
      return 'approved'
    case 'rejected':
      return 'rejected'
    default:
      return 'draft'
  }
}

/**
 * Verifica se o organizador pode solicitar publicação do evento.
 * Eventos com exclusão aprovada ou pendente NUNCA podem ser publicados.
 */
export function canRequestApproval(event: Event): boolean {
  if (event.deletion_status === 'approved' || event.deletion_status === 'pending') return false
  if (event.status !== 'draft') return false
  const approval = event.approval_status ?? 'none'
  return approval === 'none' || approval === 'rejected'
}

/**
 * Verifica se o organizador pode publicar o evento.
 * Eventos com exclusão aprovada NUNCA podem ser publicados.
 */
export function canPublishEvent(event: Event): boolean {
  if (event.deletion_status === 'approved' || event.deletion_status === 'pending') return false
  return (event.approval_status === 'approved') && event.status !== 'published'
}

/**
 * Verifica se o organizador pode ocultar/despublicar o evento.
 * Regra: Depois de publicado, o evento NÃO pode mais ser ocultado.
 */
export function canUnpublishEvent(_event: Event): boolean {
  return false
}

/**
 * Verifica se o evento foi/está publicado ou aprovado.
 * Se sim, o organizador NÃO pode excluir diretamente — deve solicitar exclusão.
 * Nota: Se deletion_status === 'approved', a exclusão já foi aprovada pelo admin, então o organizador pode APAGAR diretamente.
 */
export function requiresDeletionApproval(event: Event): boolean {
  if (event.deletion_status === 'approved') return false
  return (
    event.status === 'published' ||
    event.approval_status === 'approved' ||
    Boolean(event.published_at)
  )
}

/**
 * Verifica se o organizador pode solicitar exclusão do evento.
 * Condição: evento publicado/aprovado E deletion_status !== 'pending' E deletion_status !== 'approved'
 */
export function canRequestDeletion(event: Event): boolean {
  if (event.deletion_status === 'pending' || event.deletion_status === 'approved') return false
  return requiresDeletionApproval(event)
}


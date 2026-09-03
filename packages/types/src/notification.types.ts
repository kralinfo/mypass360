/**
 * Tipos de notificação suportados pelo sistema.
 * Extensível para novos eventos futuros.
 */
export type NotificationType =
  | 'event_approval_requested' // Notificação para administradores
  | 'event_approved'           // Notificação para o organizador
  | 'event_rejected'           // Notificação para o organizador
  | 'event_published'          // Notificação de confirmação para o organizador
  | 'event_deletion_requested' // Notificação para administradores
  | 'event_deletion_approved'  // Notificação para o organizador
  | 'event_deletion_rejected'  // Notificação para o organizador
  | 'admin_message'            // Mensagem direta do administrador para o organizador
  | 'order_paid'               // Reservado para vendas
  | 'checkin_completed'        // Reservado para portaria
  | 'system_announcement'      // Comunicados gerais
  | (string & {})              // Permite strings customizadas sem perder autocompletar


export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  read_at?: string | null
  entity_type?: string | null
  entity_id?: string | null
  action_url?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

export interface CreateNotificationDto {
  user_id: string
  type: NotificationType
  title: string
  message: string
  entity_type?: string | null
  entity_id?: string | null
  action_url?: string | null
  metadata?: Record<string, unknown> | null
}

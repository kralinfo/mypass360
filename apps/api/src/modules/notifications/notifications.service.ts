import { Injectable } from '@nestjs/common'
import { NotificationsRepository } from './notifications.repository'
import type { CreateNotificationBackendDto } from './dto/create-notification-backend.dto'

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationsRepository: NotificationsRepository) {}

  /**
   * Notifica todos os administradores sobre uma nova solicitação de publicação.
   * Direciona o clique do admin para /admin?sec=aprovacoes&event_id=ID_DO_EVENTO
   */
  async notifyApprovalRequested(event: { id: string; title: string }) {
    try {
      await this.notificationsRepository.createForAdmins({
        type: 'event_approval_requested',
        title: 'Nova solicitação de publicação 🚀',
        message: `O evento "${event.title}" foi enviado para aprovação.`,
        entityType: 'event',
        entityId: event.id,
        actionUrl: `/admin?sec=aprovacoes&event_id=${event.id}`,
        metadata: { eventTitle: event.title },
      })
    } catch (err) {
      console.error('[NotificationsService] Erro ao notificar solicitação aos admins:', err)
    }
  }

  /**
   * Notifica o organizador que seu evento foi APROVADO.
   * Direciona para /meus-eventos
   */
  async notifyEventApproved(event: { id: string; title: string; organizerId: string }) {
    try {
      await this.notificationsRepository.create({
        userId: event.organizerId,
        type: 'event_approved',
        title: 'Evento aprovado! ✅',
        message: `Seu evento "${event.title}" foi aprovado pelo administrador e agora está disponível para publicação.`,
        entityType: 'event',
        entityId: event.id,
        actionUrl: `/meus-eventos?event_id=${event.id}`,
        metadata: { eventTitle: event.title },
      })
    } catch (err) {
      console.error('[NotificationsService] Erro ao notificar aprovação ao organizador:', err)
    }
  }

  /**
   * Notifica o organizador que sua solicitação foi REJEITADA.
   * Inclui justificativa se fornecida.
   */
  async notifyEventRejected(
    event: { id: string; title: string; organizerId: string },
    reason?: string
  ) {
    try {
      const messageReason = reason
        ? ` Motivo: "${reason}".`
        : ' Você pode ajustar as informações do evento e solicitar novamente.'

      await this.notificationsRepository.create({
        userId: event.organizerId,
        type: 'event_rejected',
        title: 'Solicitação reprovada ❌',
        message: `Sua solicitação de publicação para o evento "${event.title}" não foi aprovada.${messageReason}`,
        entityType: 'event',
        entityId: event.id,
        actionUrl: `/meus-eventos?event_id=${event.id}`,
        metadata: { eventTitle: event.title, reason },
      })
    } catch (err) {
      console.error('[NotificationsService] Erro ao notificar rejeição ao organizador:', err)
    }
  }

  /**
   * Notifica o organizador confirmando que seu evento foi PUBLICADO.
   */
  async notifyEventPublished(event: { id: string; title: string; organizerId: string }) {
    try {
      await this.notificationsRepository.create({
        userId: event.organizerId,
        type: 'event_published',
        title: 'Evento publicado com sucesso! 🎉',
        message: `Seu evento "${event.title}" está publicado e visível para o público.`,
        entityType: 'event',
        entityId: event.id,
        actionUrl: `/meus-eventos?event_id=${event.id}`,
        metadata: { eventTitle: event.title },
      })
    } catch (err) {
      console.error('[NotificationsService] Erro ao notificar publicação ao organizador:', err)
    }
  }

  /**
   * Notifica administradores que o organizador solicitou a exclusão de um evento.
   * Direciona para /admin?sec=exclusoes&event_id=ID_DO_EVENTO
   */
  async notifyDeletionRequested(event: { id: string; title: string }) {
    try {
      await this.notificationsRepository.createForAdmins({
        type: 'event_deletion_requested',
        title: 'Solicitação de exclusão ⚠️',
        message: `O organizador solicitou a exclusão do evento "${event.title}".`,
        entityType: 'event',
        entityId: event.id,
        actionUrl: `/admin?sec=exclusoes&event_id=${event.id}`,
        metadata: { eventTitle: event.title },
      })
    } catch (err) {
      console.error('[NotificationsService] Erro ao notificar solicitação de exclusão aos admins:', err)
    }
  }

  /**
   * Notifica o organizador que a solicitação de exclusão foi APROVADA (evento arquivado).
   */
  async notifyDeletionApproved(event: { id: string; title: string; organizerId: string }) {
    try {
      await this.notificationsRepository.create({
        userId: event.organizerId,
        type: 'event_deletion_approved',
        title: 'Exclusão de evento aprovada 🗑️',
        message: `Sua solicitação de exclusão para o evento "${event.title}" foi aprovada e o evento foi desativado/arquivado com segurança.`,
        entityType: 'event',
        entityId: event.id,
        actionUrl: `/meus-eventos?event_id=${event.id}`,
        metadata: { eventTitle: event.title },
      })
    } catch (err) {
      console.error('[NotificationsService] Erro ao notificar aprovação de exclusão:', err)
    }
  }

  /**
   * Notifica o organizador que a solicitação de exclusão foi REJEITADA.
   */
  async notifyDeletionRejected(
    event: { id: string; title: string; organizerId: string },
    reason?: string
  ) {
    try {
      const messageReason = reason ? ` Motivo: "${reason}".` : ''
      await this.notificationsRepository.create({
        userId: event.organizerId,
        type: 'event_deletion_rejected',
        title: 'Solicitação de exclusão mantida 🛡️',
        message: `A solicitação de exclusão do evento "${event.title}" foi analisada e rejeitada.${messageReason} O evento foi mantido disponível.`,
        entityType: 'event',
        entityId: event.id,
        metadata: { eventTitle: event.title, reason },
      })
    } catch (err) {
      console.error('[NotificationsService] Erro ao notificar rejeição de exclusão:', err)
    }
  }

  /**
   * Notifica o organizador que seu evento foi excluído diretamente pela administração.
   */
  async notifyEventDeletedByAdmin(
    event: { id: string; title: string; organizerId: string },
    reason?: string
  ) {
    try {
      const messageReason = reason ? ` Motivo: "${reason}".` : ''
      await this.notificationsRepository.create({
        userId: event.organizerId,
        type: 'event_deleted_by_admin',
        title: 'Seu evento foi excluído pelo Administrador ⚠️',
        message: `O administrador removeu o evento "${event.title}".${messageReason}`,
        entityType: 'event',
        entityId: event.id,
        actionUrl: `/meus-eventos?event_id=${event.id}`,
        metadata: { eventTitle: event.title, reason },
      })
    } catch (err) {
      console.error('[NotificationsService] Erro ao notificar exclusão de evento pelo admin:', err)
    }
  }

  /**
   * Envia uma mensagem personalizada da administração para o organizador.
   */
  async sendAdminMessage(
    event: { id: string; title: string; organizerId: string },
    adminMessage: string
  ) {
    try {
      await this.notificationsRepository.create({
        userId: event.organizerId,
        type: 'admin_message',
        title: `Mensagem da Administração sobre "${event.title}" 💬`,
        message: adminMessage,
        entityType: 'event',
        entityId: event.id,
        actionUrl: `/meus-eventos?event_id=${event.id}&admin_message=${encodeURIComponent(adminMessage)}`,
        metadata: { eventTitle: event.title, adminMessage },
      })
    } catch (err) {
      console.error('[NotificationsService] Erro ao enviar mensagem do admin:', err)
    }
  }

  /**
   * Notifica os administradores em tempo real quando o organizador envia uma resposta.
   */
  async notifyOrganizerReply(event: { id: string; title: string }, replyMessage: string) {
    try {
      await this.notificationsRepository.createForAdmins({
        type: 'organizer_reply',
        title: `Resposta do Organizador 💬`,
        message: `O organizador do evento "${event.title}" respondeu: "${replyMessage}"`,
        entityType: 'event',
        entityId: event.id,
        actionUrl: `/admin?sec=exclusoes&event_id=${event.id}`,
        metadata: { eventTitle: event.title, replyMessage },
      })
    } catch (err) {
      console.error('[NotificationsService] Erro ao notificar resposta aos admins:', err)
    }
  }

  /**
   * Cria uma notificação genérica (para uso futuro).
   */
  create(dto: CreateNotificationBackendDto) {
    return this.notificationsRepository.create(dto)
  }

  /**
   * Lista as notificações do usuário autenticado.
   */
  findByUser(userId: string, limit?: number) {
    return this.notificationsRepository.findByUser(userId, limit)
  }

  /**
   * Retorna o número de notificações não lidas.
   */
  getUnreadCount(userId: string) {
    return this.notificationsRepository.getUnreadCount(userId)
  }

  /**
   * Marca uma notificação como lida.
   */
  markAsRead(id: string, userId: string) {
    return this.notificationsRepository.markAsRead(id, userId)
  }

  /**
   * Marca todas as notificações do usuário como lidas.
   */
  markAllAsRead(userId: string) {
    return this.notificationsRepository.markAllAsRead(userId)
  }

  /**
   * Exclui/limpa todas as notificações do usuário.
   */
  clearAll(userId: string) {
    return this.notificationsRepository.clearAll(userId)
  }
}

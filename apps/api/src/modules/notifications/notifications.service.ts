import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NotificationsRepository } from './notifications.repository'
import { SupabaseService } from '@/common/supabase/supabase.service'
import { MailService } from '@/common/mail/mail.service'
import type { CreateNotificationBackendDto } from './dto/create-notification-backend.dto'

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly supabase: SupabaseService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

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
   * Notifica todos os administradores que o organizador CANCELOU a solicitação de publicação.
   */
  async notifyApprovalCancelled(event: { id: string; title: string; note?: string }) {
    try {
      const noteText = event.note ? ` Observação: "${event.note}".` : ''
      await this.notificationsRepository.createForAdmins({
        type: 'event_approval_requested',
        title: 'Solicitação de publicação cancelada',
        message: `O organizador cancelou a solicitação de publicação do evento "${event.title}".${noteText}`,
        entityType: 'event',
        entityId: event.id,
        actionUrl: `/admin?sec=aprovacoes&event_id=${event.id}`,
        metadata: { eventTitle: event.title, note: event.note },
      })
    } catch (err) {
      console.error('[NotificationsService] Erro ao notificar cancelamento de solicitação:', err)
    }
  }

  /**
   * Notifica o organizador que seu evento foi APROVADO.
   * 1. Notificação interna do sistema (Notificação em tempo real)
   * 2. Envio de e-mail de confirmação para o proprietário do evento (mesmo offline)
   */
  async notifyEventApproved(event: { id: string; title: string; organizerId: string }) {
    // 1. Notificação interna
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
      console.error('[NotificationsService] Erro ao criar notificação interna de aprovação:', err)
    }

    // 2. Envio de e-mail ao proprietário do evento
    try {
      const { data: userData } = await this.supabase
        .getClient()
        .auth.admin.getUserById(event.organizerId)

      const organizerEmail = userData?.user?.email
      if (!organizerEmail) {
        console.warn(`[NotificationsService] E-mail do proprietário não encontrado para evento '${event.id}'.`)
        return
      }

      const organizerName =
        (userData?.user?.user_metadata?.name as string) ||
        (userData?.user?.user_metadata?.full_name as string) ||
        organizerEmail

      const baseUrl =
        this.config.get<string>('WEB_URL') ??
        this.config.get<string>('FRONTEND_URL') ??
        'http://localhost:3000'

      const eventUrl = `${baseUrl}/meus-eventos?event_id=${event.id}`

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
          <h2 style="color: #4f46e5; margin-top: 0;">Seu evento foi aprovado para publicação! 🎉</h2>
          <p style="color: #374151; font-size: 16px;">
            Olá, <strong>${organizerName}</strong>!
          </p>
          <p style="color: #374151; font-size: 16px;">
            Seu evento <strong>"${event.title}"</strong> foi aprovado pela administração do MyPass360.
          </p>
          <p style="color: #374151; font-size: 16px;">
            Agora você pode acessar o evento e realizar a publicação para disponibilizá-lo ao público.
          </p>
          <div style="text-align: center; margin-top: 32px; margin-bottom: 24px;">
            <a href="${eventUrl}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
              Acessar meu evento
            </a>
          </div>
          <p style="color: #6b7280; font-size: 13px; text-align: center;">
            Se o botão acima não funcionar, acesse:<br/>
            <a href="${eventUrl}" style="color: #4f46e5;">${eventUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            Equipe MyPass360 — Gestão Completa de Eventos
          </p>
        </div>
      `

      await this.mailService.sendMail({
        to: organizerEmail,
        subject: 'Seu evento foi aprovado para publicação 🎉',
        html,
      })
    } catch (err) {
      console.error('[NotificationsService] Erro ao enviar e-mail de aprovação:', err)
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
        title: 'Solicitação de exclusão rejeitada 🛡️',
        message: `A solicitação de exclusão do evento "${event.title}" foi analisada e rejeitada por um administrador.${messageReason}`,
        entityType: 'event',
        entityId: event.id,
        actionUrl: `/meus-eventos?event_id=${event.id}&deletion_rejected=true${reason ? `&reason=${encodeURIComponent(reason)}` : ''}`,
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
   * Notifica o organizador que o admin editou o evento, com a mensagem do que foi alterado.
   */
  async notifyEventEditedByAdmin(
    event: { id: string; title: string; organizerId: string },
    adminMessage: string
  ) {
    try {
      await this.notificationsRepository.create({
        userId: event.organizerId,
        type: 'admin_message',
        title: `Seu evento foi atualizado pela Administração ✏️`,
        message: `O administrador realizou alterações no evento "${event.title}". ${adminMessage}`,
        entityType: 'event',
        entityId: event.id,
        actionUrl: `/meus-eventos?event_id=${event.id}`,
        metadata: { eventTitle: event.title, adminMessage },
      })
    } catch (err) {
      console.error('[NotificationsService] Erro ao notificar edição pelo admin:', err)
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

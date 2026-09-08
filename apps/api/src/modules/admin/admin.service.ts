import { Injectable } from '@nestjs/common'
import { AdminRepository } from './admin.repository'
import { NotificationsService } from '@/modules/notifications/notifications.service'

@Injectable()
export class AdminService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly notificationsService: NotificationsService
  ) {}

  getDashboard() {
    return this.adminRepository.getDashboard()
  }

  updateUserStatus(userId: string, disabled: boolean) {
    return this.adminRepository.updateUserStatus(userId, disabled)
  }

  deleteUser(userId: string) {
    return this.adminRepository.deleteUser(userId)
  }

  updateEventStatus(eventId: string, status: 'draft' | 'published' | 'cancelled' | 'finished') {
    return this.adminRepository.updateEventStatus(eventId, status)
  }

  async deleteEvent(eventId: string, reason?: string) {
    const event = await this.adminRepository.deleteEvent(eventId)
    if (event) {
      void this.notificationsService.notifyEventDeletedByAdmin(
        { id: event.id, title: event.title, organizerId: event.organizer_id },
        reason
      )
    }
    return { success: true }
  }

  /** Lista eventos com solicitação de publicação pendente para análise. */
  getPendingApprovals() {
    return this.adminRepository.getPendingApprovals()
  }

  /** Aprova a solicitação de publicação de um evento. Notifica o organizador. */
  async approveEvent(eventId: string, adminId: string) {
    const approvedEvent = await this.adminRepository.approveEvent(eventId, adminId)
    if (approvedEvent) {
      void this.notificationsService.notifyEventApproved({
        id: approvedEvent.id,
        title: approvedEvent.title,
        organizerId: approvedEvent.organizer_id,
      })
    }
    return approvedEvent
  }

  /** Rejeita a solicitação de publicação de um evento. Notifica o organizador com justificativa. */
  async rejectEvent(eventId: string, adminId: string, reason?: string) {
    const rejectedEvent = await this.adminRepository.rejectEvent(eventId, adminId, reason)
    if (rejectedEvent) {
      void this.notificationsService.notifyEventRejected(
        {
          id: rejectedEvent.id,
          title: rejectedEvent.title,
          organizerId: rejectedEvent.organizer_id,
        },
        reason
      )
    }
    return rejectedEvent
  }

  /** Lista solicitações de exclusão de evento pendentes de análise. */
  getPendingDeletions() {
    return this.adminRepository.getPendingDeletions()
  }

  /** Aprova a exclusão do evento (arquivamento seguro). Notifica o organizador. */
  async approveDeletion(eventId: string, adminId: string) {
    const event = await this.adminRepository.approveDeletion(eventId, adminId)
    if (event) {
      void this.notificationsService.notifyDeletionApproved({
        id: event.id,
        title: event.title,
        organizerId: event.organizer_id,
      })
    }
    return event
  }

  /** Rejeita a solicitação de exclusão do evento. Notifica o organizador. */
  async rejectDeletion(eventId: string, adminId: string, reason?: string) {
    const event = await this.adminRepository.rejectDeletion(eventId, adminId, reason)
    if (event) {
      void this.notificationsService.notifyDeletionRejected(
        {
          id: event.id,
          title: event.title,
          organizerId: event.organizer_id,
        },
        reason
      )
    }
    return event
  }

  /** Envia uma mensagem direta da administração para o organizador do evento. */
  async contactOrganizer(eventId: string, _adminId: string, message: string) {
    const event = await this.adminRepository.getEventDetails(eventId)
    if (!event) throw new Error('Evento não encontrado.')

    const organizerId = (event as any).organizer_id || (event as any).organizerId
    if (!organizerId) throw new Error('Organizador do evento não encontrado.')

    await this.notificationsService.sendAdminMessage(
      {
        id: event.id,
        title: event.title,
        organizerId,
      },
      message
    )

    return { success: true }
  }

  /** Retorna o histórico de mensagens/diálogo do evento. */
  getEventMessages(eventId: string) {
    return this.adminRepository.getEventMessages(eventId)
  }

  remindPendingOrders(eventId: string) {
    return this.adminRepository.remindPendingOrders(eventId)
  }

  getEventAttendees(eventId: string) {
    return this.adminRepository.getEventAttendees(eventId)
  }

  getEventDetails(eventId: string) {
    return this.adminRepository.getEventDetails(eventId)
  }

  getCheckinAccesses(eventId: string) {
    return this.adminRepository.getCheckinAccesses(eventId)
  }

  createCheckinAccess(eventId: string, name: string) {
    return this.adminRepository.createCheckinAccess(eventId, name)
  }

  updateCheckinAccess(accessId: string, data: { name?: string; isActive?: boolean }) {
    return this.adminRepository.updateCheckinAccess(accessId, data)
  }

  deleteCheckinAccess(accessId: string) {
    return this.adminRepository.deleteCheckinAccess(accessId)
  }

  getEventCheckins(eventId: string) {
    return this.adminRepository.getEventCheckins(eventId)
  }

  resetEventCheckins(eventId: string) {
    return this.adminRepository.resetEventCheckins(eventId)
  }

  updateEventCheckinStatus(eventId: string, enabled: boolean) {
    return this.adminRepository.updateEventCheckinStatus(eventId, enabled)
  }

  deleteEventCheckin(eventId: string, checkinId: string) {
    return this.adminRepository.deleteEventCheckin(eventId, checkinId)
  }

  getAllConversations() {
    return this.adminRepository.getAllConversations()
  }

  getPublicationHistory(query: { limit?: number; page?: number; eventId?: string }) {
    return this.adminRepository.getPublicationHistory(query)
  }

  getDeletionHistory(query: { limit?: number; page?: number; eventId?: string }) {
    return this.adminRepository.getDeletionHistory(query)
  }

  getEventOptions(search?: string) {
    return this.adminRepository.getEventOptions(search)
  }
}



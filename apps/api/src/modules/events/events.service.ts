import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { EventsRepository } from './events.repository'
import { AdminRepository } from '@/modules/admin/admin.repository'
import { NotificationsService } from '@/modules/notifications/notifications.service'
import type { AuthenticatedUser } from '@/common/guards/auth.guard'
import type { CreateEventDto } from './dto/create-event.dto'
import type { UpdateEventDto } from './dto/update-event.dto'
import type { ScheduleEventDto } from './dto/schedule-event.dto'

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly adminRepository: AdminRepository,
    private readonly notificationsService: NotificationsService
  ) {}

  /** Lista eventos públicos (publicados + published_at já atingido). */
  findAll() {
    return this.eventsRepository.findAll()
  }

  /** Busca evento público por slug. */
  async findBySlug(slug: string) {
    const event = await this.eventsRepository.findBySlug(slug)
    if (!event) throw new NotFoundException(`Evento '${slug}' não encontrado`)
    return event
  }

  /** Busca evento por ID (para preenchimento do formulário de edição). */
  async findById(id: string) {
    const event = await this.eventsRepository.findById(id)
    if (!event) throw new NotFoundException(`Evento '${id}' não encontrado`)
    return event
  }

  /** Lista todos os eventos do usuário autenticado (sem filtro de publicação). */
  findMyEvents(userId: string) {
    return this.eventsRepository.findByOwner(userId)
  }

  /** Cria evento — organizer_id preenchido com userId autenticado. */
  create(dto: CreateEventDto, userId: string) {
    return this.eventsRepository.create(dto, userId)
  }

  /** Atualiza evento — valida propriedade antes de alterar. */
  async update(id: string, userId: string, dto: UpdateEventDto) {
    await this.assertOwnership(id, userId)
    return this.eventsRepository.update(id, userId, dto)
  }

  /** Remove evento — rascunhos nunca publicados ou eventos com exclusão aprovada pelo admin. */
  async remove(id: string, userId: string) {
    await this.assertOwnership(id, userId)
    const event = await this.eventsRepository.findById(id)
    if (!event) throw new NotFoundException('Evento não encontrado')

    // Bloquear exclusão direta se o evento foi/está publicado ou aprovado (exceto se a exclusão já foi aprovada pelo admin)
    if (
      (event.status === 'published' ||
        event.approval_status === 'approved' ||
        Boolean(event.published_at)) &&
      event.deletion_status !== 'approved'
    ) {
      throw new ForbiddenException(
        'Eventos publicados ou aprovados não podem ser excluídos diretamente. Utilize a opção "Solicitar exclusão".'
      )
    }

    try {
      return await this.eventsRepository.remove(id, userId)
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'foreign_key_violation') {
        if (event.deletion_status === 'approved') {
          return { success: true, message: 'Evento arquivado no histórico.' }
        }
        throw new BadRequestException(
          'Não é possível excluir um evento que já possui ingressos vendidos ou pedidos associados. Experimente solicitar a exclusão ao administrador.'
        )
      }
      throw error
    }
  }

  /** Registra solicitação de exclusão para evento publicado. Notifica os administradores. */
  async requestDeletion(id: string, userId: string, reason: string) {
    await this.assertOwnership(id, userId)
    try {
      const event = await this.eventsRepository.requestDeletion(id, userId, reason)

      // Notificar administradores em tempo real sobre a solicitação de exclusão
      if (event) {
        void this.notificationsService.notifyDeletionRequested({
          id: event.id,
          title: event.title,
        })
      }

      return event
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('ALREADY_PENDING_DELETION')) {
        throw new BadRequestException(
          'Este evento já possui uma solicitação de exclusão em análise pelo administrador.'
        )
      }
      throw err
    }
  }

  /** Envia resposta do organizador para a mensagem do administrador. Notifica os administradores em tempo real. */
  async replyAdminMessage(id: string, userId: string, replyMessage: string) {
    await this.assertOwnership(id, userId)
    const event = await this.eventsRepository.findById(id)
    if (!event) throw new NotFoundException('Evento não encontrado')

    await this.notificationsService.notifyOrganizerReply(
      { id: event.id, title: event.title },
      replyMessage
    )

    return { success: true }
  }

  /** Retorna o histórico de mensagens/diálogo do evento para o organizador. */
  async getEventMessages(id: string, userId: string) {
    await this.assertOwnership(id, userId)
    return this.adminRepository.getEventMessages(id)
  }

  /** Publica o evento imediatamente.
   * Exige approval_status = 'approved' — validado também no repository.
   */
  async publishNow(id: string, userId: string) {
    await this.assertOwnership(id, userId)
    const eventCheck = await this.eventsRepository.findById(id)
    if (eventCheck?.deletion_status === 'approved') {
      throw new ForbiddenException('Este evento foi desativado/excluído e está permanentemente indisponível para publicação.')
    }
    try {
      const publishedEvent = await this.eventsRepository.publish(id, userId)
      
      // Notificar o organizador confirmando a publicação
      if (publishedEvent) {
        void this.notificationsService.notifyEventPublished({
          id: publishedEvent.id,
          title: publishedEvent.title,
          organizerId: publishedEvent.organizer_id,
        })
      }

      return publishedEvent
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('APPROVAL_REQUIRED')) {
        throw new ForbiddenException(
          'Este evento ainda não foi aprovado para publicação. ' +
          'Solicite a publicação e aguarde a análise do administrador.'
        )
      }
      throw err
    }
  }

  /** Oculta o evento. Regra: Eventos publicados não podem ser ocultados. */
  async unpublish(_id: string, _userId: string) {
    throw new ForbiddenException('Eventos publicados não podem ser ocultados.')
  }

  /** Solicita aprovação de publicação. Apenas para eventos em draft não aprovados. */
  async requestApproval(id: string, userId: string) {
    await this.assertOwnership(id, userId)
    const eventCheck = await this.eventsRepository.findById(id)
    if (eventCheck?.deletion_status === 'approved') {
      throw new ForbiddenException('Este evento foi desativado/excluído e não pode ser reenviado para aprovação.')
    }
    try {
      const event = await this.eventsRepository.requestApproval(id, userId)

      // Notificar todos os administradores sobre a nova solicitação
      if (event) {
        void this.notificationsService.notifyApprovalRequested({
          id: event.id,
          title: event.title,
        })
      }

      return event
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.startsWith('INVALID_STATUS')) {
          throw new BadRequestException(
            'Apenas eventos em rascunho podem solicitar publicação.'
          )
        }
        if (err.message.startsWith('ALREADY_PENDING')) {
          throw new BadRequestException(
            'Este evento já possui uma solicitação de publicação aguardando análise.'
          )
        }
        if (err.message.startsWith('ALREADY_APPROVED')) {
          throw new BadRequestException(
            'Este evento já foi aprovado. Utilize a opção Publicar.'
          )
        }
      }
      throw err
    }
  }

  /** Agenda a publicação para uma data futura. Exige aprovação do admin. */
  async schedulePublication(id: string, userId: string, dto: ScheduleEventDto) {
    await this.assertOwnership(id, userId)
    try {
      return await this.eventsRepository.schedule(id, userId, dto.published_at)
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('APPROVAL_REQUIRED')) {
        throw new ForbiddenException(
          'Este evento ainda não foi aprovado para publicação. ' +
          'Solicite a publicação e aguarde a análise do administrador.'
        )
      }
      throw err
    }
  }

  /** Detalhes e métricas consolidadas do evento (valida propriedade). */
  async getEventDetails(id: string, userId: string) {
    await this.assertOwnership(id, userId)
    return this.adminRepository.getEventDetails(id)
  }

  /** Credenciais de portaria do evento (valida propriedade). */
  async getCheckinAccesses(id: string, userId: string) {
    await this.assertOwnership(id, userId)
    return this.adminRepository.getCheckinAccesses(id)
  }

  /** Cria credencial de portaria para o evento (valida propriedade). */
  async createCheckinAccess(id: string, userId: string, name: string) {
    await this.assertOwnership(id, userId)
    return this.adminRepository.createCheckinAccess(id, name)
  }

  /** Atualiza credencial de portaria do evento (valida propriedade). */
  async updateCheckinAccess(
    id: string,
    userId: string,
    accessId: string,
    dto: { name?: string; isActive?: boolean }
  ) {
    await this.assertOwnership(id, userId)
    return this.adminRepository.updateCheckinAccess(accessId, dto)
  }

  /** Exclui credencial de portaria do evento (valida propriedade). */
  async deleteCheckinAccess(id: string, userId: string, accessId: string) {
    await this.assertOwnership(id, userId)
    return this.adminRepository.deleteCheckinAccess(accessId)
  }

  /** Lista registros de check-in do evento (valida propriedade). */
  async getEventCheckins(id: string, userId: string) {
    await this.assertOwnership(id, userId)
    return this.adminRepository.getEventCheckins(id)
  }

  /** Ativa ou desativa portaria do evento (valida propriedade). */
  async updateEventCheckinStatus(id: string, userId: string, enabled: boolean) {
    await this.assertOwnership(id, userId)
    return this.adminRepository.updateEventCheckinStatus(id, enabled)
  }

  /** Exclui check-in individual (valida propriedade e restaura ingresso). */
  async deleteEventCheckin(id: string, userId: string, checkinId: string) {
    await this.assertOwnership(id, userId)
    return this.adminRepository.deleteEventCheckin(id, checkinId)
  }

  /** Reseta todos os check-ins do evento para testes (valida propriedade). */
  async resetEventCheckins(id: string, userId: string) {
    await this.assertOwnership(id, userId)
    return this.adminRepository.resetEventCheckins(id)
  }

  /**
   * Valida que o evento existe e pertence ao usuário (ou concede acesso irrestrito se for Admin).
   * Lança ForbiddenException (403) se não for o proprietário nem administrador.
   */
  private async assertOwnership(id: string, user: AuthenticatedUser | string): Promise<void> {
    const userId = typeof user === 'string' ? user : user.id
    const userRole = typeof user !== 'string' ? (user.user_metadata?.role as string) : undefined
    const userEmail = typeof user !== 'string' ? user.email : ''

    // Administradores têm acesso a todos os eventos do sistema
    if (userRole === 'admin' || userRole === 'superadmin' || userEmail === 'admin@mypass360.com') {
      return
    }

    const event = await this.eventsRepository.findByIdAndOwner(id, userId)

    if (!event) {
      throw new ForbiddenException(
        'Você não tem permissão para gerenciar este evento'
      )
    }
  }
}

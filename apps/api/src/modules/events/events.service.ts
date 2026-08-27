import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { EventsRepository } from './events.repository'
import { AdminRepository } from '@/modules/admin/admin.repository'
import type { AuthenticatedUser } from '@/common/guards/auth.guard'
import type { CreateEventDto } from './dto/create-event.dto'
import type { UpdateEventDto } from './dto/update-event.dto'
import type { ScheduleEventDto } from './dto/schedule-event.dto'

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly adminRepository: AdminRepository
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

  /** Remove evento — valida propriedade antes de deletar. */
  async remove(id: string, userId: string) {
    await this.assertOwnership(id, userId)
    try {
      return await this.eventsRepository.remove(id, userId)
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'foreign_key_violation') {
        throw new BadRequestException(
          'Não é possível excluir um evento que já possui ingressos vendidos ou pedidos associados. Experimente ocultá-lo.'
        )
      }
      throw error
    }
  }

  /** Publica o evento imediatamente. */
  async publishNow(id: string, userId: string) {
    await this.assertOwnership(id, userId)
    return this.eventsRepository.publish(id, userId)
  }

  /** Oculta o evento (volta para draft). */
  async unpublish(id: string, userId: string) {
    await this.assertOwnership(id, userId)
    return this.eventsRepository.unpublish(id, userId)
  }

  /** Agenda a publicação para uma data futura. */
  async schedulePublication(id: string, userId: string, dto: ScheduleEventDto) {
    await this.assertOwnership(id, userId)
    return this.eventsRepository.schedule(id, userId, dto.published_at)
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

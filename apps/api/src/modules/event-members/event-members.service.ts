import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EventMembersRepository } from './event-members.repository'
import { EventsRepository } from '../events/events.repository'
import { NotificationsRepository } from '../notifications/notifications.repository'
import { MailService } from '@/common/mail/mail.service'
import type { AuthenticatedUser } from '@/common/guards/auth.guard'
import * as crypto from 'crypto'

@Injectable()
export class EventMembersService {
  constructor(
    private readonly repository: EventMembersRepository,
    private readonly eventsRepository: EventsRepository,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Envia um convite de sócio para o e-mail informado
   */
  async sendInvitation(eventId: string, currentUser: AuthenticatedUser, email: string) {
    const normalizedEmail = email.trim().toLowerCase()

    // 1. Buscar evento
    const event = await this.eventsRepository.findById(eventId)
    if (!event) {
      throw new NotFoundException('Evento não encontrado.')
    }

    // 2. Verificar se quem está convidando é o dono do evento
    if (event.organizer_id !== currentUser.id) {
      throw new ForbiddenException('Apenas o proprietário do evento pode adicionar sócios.')
    }

    // 3. Verificar se o e-mail convidado é o próprio dono
    if (currentUser.email && currentUser.email.toLowerCase() === normalizedEmail) {
      throw new BadRequestException('Você já é o proprietário deste evento.')
    }

    const invitedUser = await this.repository.findUserByEmail(normalizedEmail)
    if (invitedUser && invitedUser.id === event.organizer_id) {
      throw new BadRequestException('Este e-mail pertence ao proprietário do evento.')
    }

    // 4. Verificar se já é sócio ativo
    const existingMember = await this.repository.findActiveMemberByEmail(eventId, normalizedEmail)
    if (existingMember) {
      throw new BadRequestException('Este e-mail já é um sócio ativo do evento.')
    }

    // 5. Verificar se já existe convite pendente
    const pendingInvite = await this.repository.findPendingInvitation(eventId, normalizedEmail)
    if (pendingInvite) {
      throw new BadRequestException('Já existe um convite pendente para este e-mail.')
    }

    // 6. Criar convite
    const token = crypto.randomUUID()
    const invitation = await this.repository.createInvitation({
      eventId,
      invitedEmail: normalizedEmail,
      invitedUserId: invitedUser?.id ?? null,
      invitedBy: currentUser.id,
      token,
    })

    // 7. Notificação interna (se o usuário já tem conta no sistema)
    if (invitedUser?.id) {
      try {
        await this.notificationsRepository.create({
          userId: invitedUser.id,
          type: 'event_partner_invite',
          title: 'Convite para Sócio 🤝',
          message: `Você foi convidado para ser sócio do evento "${event.title}".`,
          entityType: 'event',
          entityId: event.id,
          actionUrl: `/convite/${token}`,
          metadata: {
            token,
            eventId: event.id,
            eventTitle: event.title,
            inviterName: currentUser.email,
          },
        })
      } catch (err) {
        console.error('[EventMembersService] Erro ao criar notificação interna:', err)
      }
    }

    // 8. Envio de E-mail
    const baseUrl = this.config.get<string>('WEB_URL') ?? this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/convite/${token}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
        <h2 style="color: #4f46e5; margin-top: 0;">Você foi convidado para ser sócio!</h2>
        <p style="color: #374151; font-size: 16px;">
          O responsável pelo evento <strong>${event.title}</strong> convidou você para ajudar na administração e operação do evento.
        </p>
        <div style="margin: 24px 0; padding: 16px; background-color: #ffffff; border-radius: 8px; border-left: 4px solid #4f46e5;">
          <h3 style="margin: 0 0 8px 0; color: #111827;">${event.title}</h3>
          <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>Local:</strong> ${event.location || 'Não informado'}</p>
          <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;"><strong>Data:</strong> ${event.date ? new Date(event.date).toLocaleDateString('pt-BR') : 'Não informada'}</p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Convite enviado para: <strong>${normalizedEmail}</strong>
        </p>
        <div style="text-align: center; margin-top: 32px; margin-bottom: 24px;">
          <a href="${inviteUrl}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
            Ver convite
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          MyPass360 — Plataforma Completa de Gestão de Eventos
        </p>
      </div>
    `

    try {
      await this.mailService.sendMail({
        to: normalizedEmail,
        subject: `Convite para ser sócio do evento: ${event.title}`,
        html,
      })
    } catch (err) {
      console.error('[EventMembersService] Erro ao enviar e-mail de convite:', err)
    }

    return invitation
  }

  /**
   * Busca detalhes do convite pelo token (público / para tela de aceite)
   */
  async getInvitationDetails(token: string) {
    const invitation = await this.repository.findInvitationByToken(token)
    if (!invitation) {
      throw new NotFoundException('Convite não encontrado ou inválido.')
    }

    const event = invitation.events
    return {
      invitation: {
        id: invitation.id,
        event_id: invitation.event_id,
        invited_email: invitation.invited_email,
        invited_user_id: invitation.invited_user_id,
        invited_by: invitation.invited_by,
        token: invitation.token,
        status: invitation.status,
        created_at: invitation.created_at,
        accepted_at: invitation.accepted_at,
        expires_at: invitation.expires_at,
      },
      event: {
        id: event?.id,
        title: event?.title ?? 'Evento',
        date: event?.date ?? null,
        location: event?.location ?? null,
        banner_url: event?.image_url ?? event?.banner_url ?? null,
        organizer_id: event?.organizer_id,
      },
    }
  }

  /**
   * Aceita um convite de sócio
   */
  async acceptInvitation(token: string, currentUser: AuthenticatedUser) {
    const invitation = await this.repository.findInvitationByToken(token)
    if (!invitation) {
      throw new NotFoundException('Convite não encontrado.')
    }

    if (invitation.status === 'ACCEPTED') {
      throw new BadRequestException('Este convite já foi aceito anteriormente.')
    }

    if (invitation.status === 'CANCELLED') {
      throw new BadRequestException('Este convite foi cancelado pelo organizador.')
    }

    if (invitation.status === 'EXPIRED') {
      throw new BadRequestException('Este convite expirou.')
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Este convite não está mais disponível.')
    }

    // Validação de expiração por data
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      throw new BadRequestException('Este convite expirou.')
    }

    // 🔒 VALIDAÇÃO DE SEGURANÇA CRÍTICA: E-mail da conta logada == E-mail do convite
    const userEmail = currentUser.email ? currentUser.email.trim().toLowerCase() : ''
    const invitedEmail = invitation.invited_email.trim().toLowerCase()

    if (!userEmail || userEmail !== invitedEmail) {
      throw new ForbiddenException(
        `Este convite foi enviado para ${invitation.invited_email}. Você está autenticado como ${currentUser.email ?? 'outra conta'}. Entre com a conta correta para aceitar.`
      )
    }

    // Verificar se a pessoa não é o próprio dono
    const event = invitation.events
    if (event && event.organizer_id === currentUser.id) {
      throw new BadRequestException('Você é o proprietário deste evento.')
    }

    // Aceitar convite no repositório
    const result = await this.repository.acceptInvitation(invitation.id, invitation.event_id, currentUser.id)

    // Notificar o dono do evento que o convite foi aceito
    if (event?.organizer_id) {
      try {
        await this.notificationsRepository.create({
          userId: event.organizer_id,
          type: 'event_partner_accepted',
          title: 'Convite aceito! 🎉',
          message: `${currentUser.email} aceitou o convite e agora é sócio do evento "${event.title}".`,
          entityType: 'event',
          entityId: event.id,
          actionUrl: `/meus-eventos?event_id=${event.id}`,
          metadata: { partnerEmail: currentUser.email, eventTitle: event.title },
        })
      } catch (err) {
        console.error('[EventMembersService] Erro ao notificar aceite ao proprietário:', err)
      }
    }

    return result
  }

  /**
   * Rejeita um convite de sócio
   */
  async rejectInvitation(token: string, currentUser: AuthenticatedUser) {
    const invitation = await this.repository.findInvitationByToken(token)
    if (!invitation) {
      throw new NotFoundException('Convite não encontrado.')
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Este convite não está pendente.')
    }

    const userEmail = currentUser.email ? currentUser.email.trim().toLowerCase() : ''
    const invitedEmail = invitation.invited_email.trim().toLowerCase()

    if (!userEmail || userEmail !== invitedEmail) {
      throw new ForbiddenException('Este convite pertence a outro e-mail.')
    }

    return this.repository.rejectInvitation(invitation.id)
  }

  /**
   * Lista sócios ativos e convites pendentes de um evento (apenas dono ou sócio)
   */
  async getPartnersAndInvitations(eventId: string, currentUser: AuthenticatedUser) {
    const event = await this.eventsRepository.findById(eventId)
    if (!event) {
      throw new NotFoundException('Evento não encontrado.')
    }

    const isOwner = event.organizer_id === currentUser.id
    const isPartner = await this.repository.findActiveMember(eventId, currentUser.id)

    if (!isOwner && !isPartner) {
      throw new ForbiddenException('Você não tem permissão para visualizar os colaboradores deste evento.')
    }

    const members = await this.repository.findMembersByEvent(eventId)
    const invitations = isOwner ? await this.repository.findInvitationsByEvent(eventId) : []

    return {
      members,
      invitations,
      isOwner,
    }
  }

  /**
   * Cancela um convite pendente (apenas o proprietário)
   */
  async cancelInvitation(eventId: string, inviteId: string, currentUser: AuthenticatedUser) {
    const event = await this.eventsRepository.findById(eventId)
    if (!event) throw new NotFoundException('Evento não encontrado.')

    if (event.organizer_id !== currentUser.id) {
      throw new ForbiddenException('Apenas o proprietário pode cancelar convites.')
    }

    const cancelled = await this.repository.cancelInvitation(inviteId, eventId)
    if (!cancelled) {
      throw new NotFoundException('Convite não encontrado ou já processado.')
    }

    return cancelled
  }

  /**
   * Remove um sócio do evento (apenas o proprietário)
   */
  async removeMember(eventId: string, memberUserId: string, currentUser: AuthenticatedUser) {
    const event = await this.eventsRepository.findById(eventId)
    if (!event) throw new NotFoundException('Evento não encontrado.')

    if (event.organizer_id !== currentUser.id) {
      throw new ForbiddenException('Apenas o proprietário pode remover sócios.')
    }

    if (memberUserId === currentUser.id) {
      throw new BadRequestException('O proprietário não pode ser removido dos sócios.')
    }

    const removed = await this.repository.removeMember(eventId, memberUserId)
    if (!removed) {
      throw new NotFoundException('Sócio não encontrado.')
    }

    // Notificar o sócio removido
    try {
      await this.notificationsRepository.create({
        userId: memberUserId,
        type: 'event_partner_removed',
        title: 'Acesso revogado',
        message: `Seu acesso como sócio do evento "${event.title}" foi revogado pelo proprietário.`,
        entityType: 'event',
        entityId: event.id,
        actionUrl: `/meus-eventos`,
        metadata: { eventTitle: event.title },
      })
    } catch (err) {
      console.error('[EventMembersService] Erro ao notificar sócio removido:', err)
    }

    return removed
  }
}

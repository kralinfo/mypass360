import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common'
import { EventMembersService } from './event-members.service'
import { CreateInviteDto } from './dto/create-invite.dto'
import { AuthGuard, type AuthenticatedUser } from '@/common/guards/auth.guard'
import { CurrentUser } from '@/common/decorators/current-user.decorator'

@Controller()
export class EventMembersController {
  constructor(private readonly eventMembersService: EventMembersService) {}

  /**
   * POST /events/:eventId/partners/invitations
   * Enviar convite de sócio por e-mail (apenas o dono)
   */
  @Post('events/:eventId/partners/invitations')
  @UseGuards(AuthGuard)
  sendInvitation(
    @Param('eventId') eventId: string,
    @Body() dto: CreateInviteDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventMembersService.sendInvitation(eventId, user, dto.email)
  }

  /**
   * GET /events/:eventId/partners
   * Listar sócios ativos e convites pendentes do evento
   */
  @Get('events/:eventId/partners')
  @UseGuards(AuthGuard)
  getPartnersAndInvitations(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventMembersService.getPartnersAndInvitations(eventId, user)
  }

  /**
   * DELETE /events/:eventId/partners/invitations/:inviteId
   * Cancelar um convite pendente (apenas o dono)
   */
  @Delete('events/:eventId/partners/invitations/:inviteId')
  @UseGuards(AuthGuard)
  cancelInvitation(
    @Param('eventId') eventId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventMembersService.cancelInvitation(eventId, inviteId, user)
  }

  /**
   * DELETE /events/:eventId/partners/members/:memberUserId
   * Remover um sócio do evento (apenas o dono)
   */
  @Delete('events/:eventId/partners/members/:memberUserId')
  @UseGuards(AuthGuard)
  removeMember(
    @Param('eventId') eventId: string,
    @Param('memberUserId') memberUserId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventMembersService.removeMember(eventId, memberUserId, user)
  }

  /**
   * GET /invitations/:token
   * Buscar detalhes do convite por token (público / para renderizar tela de convite)
   */
  @Get('invitations/:token')
  getInvitationDetails(@Param('token') token: string) {
    return this.eventMembersService.getInvitationDetails(token)
  }

  /**
   * POST /invitations/:token/accept
   * Aceitar convite de sócio (autenticado)
   */
  @Post('invitations/:token/accept')
  @UseGuards(AuthGuard)
  acceptInvitation(
    @Param('token') token: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventMembersService.acceptInvitation(token, user)
  }

  /**
   * POST /invitations/:token/reject
   * Rejeitar convite de sócio (autenticado)
   */
  @Post('invitations/:token/reject')
  @UseGuards(AuthGuard)
  rejectInvitation(
    @Param('token') token: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventMembersService.rejectInvitation(token, user)
  }
}

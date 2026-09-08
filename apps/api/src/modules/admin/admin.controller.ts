import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { AdminService } from './admin.service'
import { UpdateAdminUserStatusDto } from './dto/update-admin-user-status.dto'
import { UpdateAdminEventStatusDto } from './dto/update-admin-event-status.dto'
import { CreateCheckinAccessDto } from './dto/create-checkin-access.dto'
import { UpdateCheckinAccessDto } from './dto/update-checkin-access.dto'
import { UpdateEventCheckinStatusDto } from './dto/update-event-checkin-status.dto'
import { RejectEventDto } from './dto/reject-event.dto'
import { ContactOrganizerDto } from './dto/contact-organizer.dto'
import { AuthGuard, type AuthenticatedUser } from '@/common/guards/auth.guard'
import { CurrentUser } from '@/common/decorators/current-user.decorator'

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard()
  }

  @Patch('users/:id/status')
  updateUserStatus(@Param('id') id: string, @Body() dto: UpdateAdminUserStatusDto) {
    return this.adminService.updateUserStatus(id, dto.disabled)
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id)
  }

  @Patch('events/:id/status')
  updateEventStatus(@Param('id') id: string, @Body() dto: UpdateAdminEventStatusDto) {
    return this.adminService.updateEventStatus(id, dto.status)
  }

  @Delete('events/:id')
  deleteEvent(@Param('id') id: string, @Body() dto: { reason?: string }) {
    return this.adminService.deleteEvent(id, dto?.reason)
  }

  @Post('events/:id/delete')
  forceDeleteEvent(@Param('id') id: string, @Body() dto: { reason?: string }) {
    return this.adminService.deleteEvent(id, dto?.reason)
  }

  /** GET /admin/events/pending-approvals — lista solicitações de publicação pendentes */
  @Get('events/pending-approvals')
  getPendingApprovals() {
    return this.adminService.getPendingApprovals()
  }

  /** POST /admin/events/:id/approve — aprova solicitação de publicação */
  @Post('events/:id/approve')
  @UseGuards(AuthGuard)
  approveEvent(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser
  ) {
    return this.adminService.approveEvent(id, admin.id)
  }

  /** POST /admin/events/:id/reject — rejeita solicitação de publicação */
  @Post('events/:id/reject')
  @UseGuards(AuthGuard)
  rejectEvent(
    @Param('id') id: string,
    @Body() dto: RejectEventDto,
    @CurrentUser() admin: AuthenticatedUser
  ) {
    return this.adminService.rejectEvent(id, admin.id, dto.reason)
  }

  /** GET /admin/events/pending-deletions — lista solicitações de exclusão pendentes */
  @Get('events/pending-deletions')
  getPendingDeletions() {
    return this.adminService.getPendingDeletions()
  }

  /** POST /admin/events/:id/approve-deletion — aprova a exclusão (arquivamento) */
  @Post('events/:id/approve-deletion')
  @UseGuards(AuthGuard)
  approveDeletion(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser
  ) {
    return this.adminService.approveDeletion(id, admin.id)
  }

  /** POST /admin/events/:id/reject-deletion — rejeita a solicitação de exclusão */
  @Post('events/:id/reject-deletion')
  @UseGuards(AuthGuard)
  rejectDeletion(
    @Param('id') id: string,
    @Body() dto: RejectEventDto,
    @CurrentUser() admin: AuthenticatedUser
  ) {
    return this.adminService.rejectDeletion(id, admin.id, dto.reason)
  }

  /** POST /admin/events/:id/contact-organizer — envia mensagem direta da administração para o organizador */
  @Post('events/:id/contact-organizer')
  @UseGuards(AuthGuard)
  contactOrganizer(
    @Param('id') id: string,
    @Body() dto: ContactOrganizerDto,
    @CurrentUser() admin: AuthenticatedUser
  ) {
    return this.adminService.contactOrganizer(id, admin.id, dto.message)
  }

  /** GET /admin/publications/history — lista histórico de solicitações de publicação */
  @Get('publications/history')
  getPublicationHistory(
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('eventId') eventId?: string
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined
    const parsedPage = page ? parseInt(page, 10) : undefined
    return this.adminService.getPublicationHistory({
      limit: isNaN(parsedLimit as number) ? undefined : parsedLimit,
      page: isNaN(parsedPage as number) ? undefined : parsedPage,
      eventId,
    })
  }

  /** GET /admin/deletions/history — lista histórico de solicitações de exclusão */
  @Get('deletions/history')
  getDeletionHistory(
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Query('eventId') eventId?: string
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined
    const parsedPage = page ? parseInt(page, 10) : undefined
    return this.adminService.getDeletionHistory({
      limit: isNaN(parsedLimit as number) ? undefined : parsedLimit,
      page: isNaN(parsedPage as number) ? undefined : parsedPage,
      eventId,
    })
  }

  /** GET /admin/events/options — retorna opções de eventos para o seletor pesquisável */
  @Get('events/options')
  getEventOptions(@Query('search') search?: string) {
    return this.adminService.getEventOptions(search)
  }

  /** GET /admin/events/:id/messages — lista o histórico de mensagens trocadas no evento */
  @Get('events/:id/messages')
  getEventMessages(@Param('id') id: string) {
    return this.adminService.getEventMessages(id)
  }

  /** GET /admin/conversations — lista todas as conversas/diálogos ativos por evento */
  @Get('conversations')
  getAllConversations() {
    return this.adminService.getAllConversations()
  }
  @Post('events/:id/remind-pending')
  remindPendingOrders(@Param('id') id: string) {
    return this.adminService.remindPendingOrders(id)
  }

  @Get('events/:id/attendees')
  getEventAttendees(@Param('id') id: string) {
    return this.adminService.getEventAttendees(id)
  }

  @Get('events/:id/details')
  getEventDetails(@Param('id') id: string) {
    return this.adminService.getEventDetails(id)
  }

  @Get('events/:id/checkin-accesses')
  getCheckinAccesses(@Param('id') id: string) {
    return this.adminService.getCheckinAccesses(id)
  }

  @Post('events/:id/checkin-accesses')
  createCheckinAccess(@Param('id') id: string, @Body() dto: CreateCheckinAccessDto) {
    return this.adminService.createCheckinAccess(id, dto.name)
  }

  @Patch('events/:id/checkin-accesses/:accessId')
  updateCheckinAccess(
    @Param('id') _id: string,
    @Param('accessId') accessId: string,
    @Body() dto: UpdateCheckinAccessDto
  ) {
    return this.adminService.updateCheckinAccess(accessId, dto)
  }

  @Delete('events/:id/checkin-accesses/:accessId')
  deleteCheckinAccess(
    @Param('id') _id: string,
    @Param('accessId') accessId: string
  ) {
    return this.adminService.deleteCheckinAccess(accessId)
  }

  @Get('events/:id/checkins')
  getEventCheckins(@Param('id') id: string) {
    return this.adminService.getEventCheckins(id)
  }

  @Patch('events/:id/checkin-status')
  updateEventCheckinStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEventCheckinStatusDto
  ) {
    return this.adminService.updateEventCheckinStatus(id, dto.enabled)
  }


  @Delete('events/:id/checkins/:checkinId')
  deleteEventCheckin(
    @Param('id') eventId: string,
    @Param('checkinId') checkinId: string
  ) {
    return this.adminService.deleteEventCheckin(eventId, checkinId)
  }

  /**
   * Limpa todos os check-ins do evento para testes.
   * // TODO: Avaliar remoção ou restrição desta ação em produção.
   * // Funcionalidade utilizada atualmente para resetar check-ins durante testes.
   */
  @Delete('events/:id/checkins')
  resetEventCheckins(@Param('id') id: string) {
    return this.adminService.resetEventCheckins(id)
  }
}




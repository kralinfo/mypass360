import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common'
import { EventsService } from './events.service'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'
import { ScheduleEventDto } from './dto/schedule-event.dto'
import { RequestEventDeletionDto } from './dto/request-event-deletion.dto'
import { ReplyAdminMessageDto } from './dto/reply-admin-message.dto'
import { AuthGuard, type AuthenticatedUser } from '@/common/guards/auth.guard'
import { CurrentUser } from '@/common/decorators/current-user.decorator'

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /** GET /events — lista pública de eventos publicados */
  @Get()
  findAll() {
    return this.eventsService.findAll()
  }

  /**
   * GET /events/my — eventos do usuário autenticado (protegido).
   * IMPORTANTE: Deve ser declarado ANTES de GET /events/:slug
   * para evitar que 'my' seja interpretado como um slug.
   */
  @Get('my')
  @UseGuards(AuthGuard)
  findMyEvents(@CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.findMyEvents(user.id)
  }

  /**
   * GET /events/by-id/:id — busca evento por ID (autenticado, para modo edição).
   * Deve ser declarado ANTES de GET /events/:slug.
   */
  @Get('by-id/:id')
  @UseGuards(AuthGuard)
  findById(@Param('id') id: string) {
    return this.eventsService.findById(id)
  }

  /** GET /events/:slug — detalhe de evento público */
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.eventsService.findBySlug(slug)
  }

  /** POST /events — criar novo evento (protegido) */
  @Post()
  @UseGuards(AuthGuard)
  create(@Body() dto: CreateEventDto, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.create(dto, user.id)
  }

  /** PATCH /events/:id — editar evento (protegido, apenas o proprietário) */
  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.update(id, user.id, dto)
  }

  /** DELETE /events/:id — remover evento (protegido, apenas o proprietário) */
  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.remove(id, user.id)
  }

  /** PATCH /events/:id/publish — publicar imediatamente (protegido) */
  @Patch(':id/publish')
  @UseGuards(AuthGuard)
  publish(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.publishNow(id, user.id)
  }

  /** PATCH /events/:id/unpublish — ocultar evento (protegido) */
  @Patch(':id/unpublish')
  @UseGuards(AuthGuard)
  unpublish(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.unpublish(id, user.id)
  }

  /** PATCH /events/:id/schedule — agendar publicação (protegido) */
  @Patch(':id/schedule')
  @UseGuards(AuthGuard)
  schedule(
    @Param('id') id: string,
    @Body() dto: ScheduleEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.eventsService.schedulePublication(id, user.id, dto)
  }

  /** POST /events/:id/request-approval — solicitar aprovação de publicação (protegido) */
  @Post(':id/request-approval')
  @UseGuards(AuthGuard)
  requestApproval(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.requestApproval(id, user.id)
  }

  /** POST /events/:id/request-deletion — solicitar exclusão de evento publicado (protegido) */
  @Post(':id/request-deletion')
  @UseGuards(AuthGuard)
  requestDeletion(
    @Param('id') id: string,
    @Body() dto: RequestEventDeletionDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventsService.requestDeletion(id, user.id, dto.reason)
  }

  /** POST /events/:id/reply-admin-message — responder mensagem do administrador (protegido) */
  @Post(':id/reply-admin-message')
  @UseGuards(AuthGuard)
  replyAdminMessage(
    @Param('id') id: string,
    @Body() dto: ReplyAdminMessageDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventsService.replyAdminMessage(id, user.id, dto.replyMessage)
  }

  /** GET /events/:id/messages — lista histórico de mensagens do evento para o organizador */
  @Get(':id/messages')
  @UseGuards(AuthGuard)
  getEventMessages(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.getEventMessages(id, user.id)
  }

  /** GET /events/:id/details — detalhes e métricas do evento (protegido) */
  @Get(':id/details')
  @UseGuards(AuthGuard)
  getEventDetails(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.getEventDetails(id, user.id)
  }

  /** GET /events/:id/checkin-accesses — credenciais de portaria do evento (protegido) */
  @Get(':id/checkin-accesses')
  @UseGuards(AuthGuard)
  getCheckinAccesses(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.getCheckinAccesses(id, user.id)
  }

  /** POST /events/:id/checkin-accesses — cria credencial de portaria (protegido) */
  @Post(':id/checkin-accesses')
  @UseGuards(AuthGuard)
  createCheckinAccess(
    @Param('id') id: string,
    @Body() body: { name: string },
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventsService.createCheckinAccess(id, user.id, body.name)
  }

  /** PATCH /events/:id/checkin-accesses/:accessId — atualiza credencial (protegido) */
  @Patch(':id/checkin-accesses/:accessId')
  @UseGuards(AuthGuard)
  updateCheckinAccess(
    @Param('id') id: string,
    @Param('accessId') accessId: string,
    @Body() body: { name?: string; isActive?: boolean },
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventsService.updateCheckinAccess(id, user.id, accessId, body)
  }

  /** DELETE /events/:id/checkin-accesses/:accessId — remove credencial (protegido) */
  @Delete(':id/checkin-accesses/:accessId')
  @UseGuards(AuthGuard)
  deleteCheckinAccess(
    @Param('id') id: string,
    @Param('accessId') accessId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventsService.deleteCheckinAccess(id, user.id, accessId)
  }

  /** GET /events/:id/checkins — lista check-ins do evento (protegido) */
  @Get(':id/checkins')
  @UseGuards(AuthGuard)
  getEventCheckins(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.getEventCheckins(id, user.id)
  }

  /** PATCH /events/:id/checkin-status — ativa/desativa portaria do evento (protegido) */
  @Patch(':id/checkin-status')
  @UseGuards(AuthGuard)
  updateEventCheckinStatus(
    @Param('id') id: string,
    @Body() body: { enabled: boolean },
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventsService.updateEventCheckinStatus(id, user.id, body.enabled)
  }

  /** DELETE /events/:id/checkins/:checkinId — exclui check-in individual (protegido) */
  @Delete(':id/checkins/:checkinId')
  @UseGuards(AuthGuard)
  deleteEventCheckin(
    @Param('id') id: string,
    @Param('checkinId') checkinId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.eventsService.deleteEventCheckin(id, user.id, checkinId)
  }

  /** DELETE /events/:id/checkins — reseta check-ins do evento (protegido) */
  @Delete(':id/checkins')
  @UseGuards(AuthGuard)
  resetEventCheckins(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.eventsService.resetEventCheckins(id, user.id)
  }
}

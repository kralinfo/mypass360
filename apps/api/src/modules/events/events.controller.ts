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
}

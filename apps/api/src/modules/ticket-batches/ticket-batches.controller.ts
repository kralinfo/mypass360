import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { TicketBatchesService } from './ticket-batches.service'
import { CreateTicketBatchDto } from './dto/create-ticket-batch.dto'
import { UpdateTicketBatchDto } from './dto/update-ticket-batch.dto'
import { AuthGuard, type AuthenticatedUser } from '@/common/guards/auth.guard'
import { CurrentUser } from '@/common/decorators/current-user.decorator'
import { EventsService } from '@/modules/events/events.service'

@Controller()
export class TicketBatchesController {
  constructor(
    private readonly batchesService: TicketBatchesService,
    private readonly eventsService: EventsService
  ) {}

  /**
   * GET /events/:eventId/ticket-types/:ticketTypeId/batches
   * Lista os lotes de um tipo de ingresso. Público (para checkout).
   */
  @Get('events/:eventId/ticket-types/:ticketTypeId/batches')
  listBatches(@Param('ticketTypeId') ticketTypeId: string) {
    return this.batchesService.listBatches(ticketTypeId)
  }

  /**
   * GET /events/:eventId/ticket-types/:ticketTypeId/batches/active
   * Retorna o lote vigente com preço e disponibilidade. Usado pelo checkout.
   */
  @Get('events/:eventId/ticket-types/:ticketTypeId/batches/active')
  getActiveBatch(@Param('ticketTypeId') ticketTypeId: string) {
    return this.batchesService.getActiveBatchInfo(ticketTypeId)
  }

  /**
   * GET /events/:eventId/batches
   * Lista todos os lotes de um evento (todos os ticket_types). Protegido.
   */
  @Get('events/:eventId/batches')
  @UseGuards(AuthGuard)
  async listEventBatches(
    @Param('eventId') eventId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    // Valida que o usuário tem acesso ao evento
    await this.eventsService.getEventDetails(eventId, user.id)
    return this.batchesService.listBatchesForEvent(eventId)
  }

  /**
   * POST /events/:eventId/ticket-types/:ticketTypeId/batches
   * Cria um novo lote. Protegido.
   */
  @Post('events/:eventId/ticket-types/:ticketTypeId/batches')
  @UseGuards(AuthGuard)
  async createBatch(
    @Param('eventId') eventId: string,
    @Param('ticketTypeId') ticketTypeId: string,
    @Body() dto: CreateTicketBatchDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    await this.assertTicketTypeOwnership(eventId, ticketTypeId, user.id)
    // Habilitar batch_mode automaticamente ao criar o primeiro lote
    await this.batchesService.enableBatchMode(ticketTypeId)
    return this.batchesService.createBatch(ticketTypeId, dto)
  }

  /**
   * PATCH /ticket-batches/:batchId
   * Atualiza um lote existente. Protegido.
   */
  @Patch('ticket-batches/:batchId')
  @UseGuards(AuthGuard)
  async updateBatch(
    @Param('batchId') batchId: string,
    @Body() dto: UpdateTicketBatchDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    await this.assertBatchOwnership(batchId, user.id)
    return this.batchesService.updateBatch(batchId, dto)
  }

  /**
   * PATCH /ticket-batches/:batchId/close
   * Encerra um lote. Protegido.
   */
  @Patch('ticket-batches/:batchId/close')
  @UseGuards(AuthGuard)
  async closeBatch(
    @Param('batchId') batchId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    await this.assertBatchOwnership(batchId, user.id)
    return this.batchesService.closeBatch(batchId)
  }

  /**
   * PATCH /ticket-batches/:batchId/reopen
   * Reabre um lote anterior (esgotado ou encerrado) como lote vigente. Protegido.
   */
  @Patch('ticket-batches/:batchId/reopen')
  @UseGuards(AuthGuard)
  async reopenBatch(
    @Param('batchId') batchId: string,
    @Body() dto: { quantity?: number; price?: number; is_unlimited?: boolean },
    @CurrentUser() user: AuthenticatedUser
  ) {
    await this.assertBatchOwnership(batchId, user.id)
    return this.batchesService.reopenBatch(batchId, dto)
  }

  /**
   * DELETE /ticket-batches/:batchId
   * Deleta um lote sem vendas. Protegido.
   */
  @Delete('ticket-batches/:batchId')
  @UseGuards(AuthGuard)
  async deleteBatch(
    @Param('batchId') batchId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    await this.assertBatchOwnership(batchId, user.id)
    return this.batchesService.deleteBatch(batchId)
  }

  /**
   * PATCH /events/:eventId/ticket-types/:ticketTypeId/batch-mode
   * Ativa ou desativa o modo de lotes para um tipo de ingresso. Protegido.
   */
  @Patch('events/:eventId/ticket-types/:ticketTypeId/batch-mode')
  @UseGuards(AuthGuard)
  async setBatchMode(
    @Param('eventId') eventId: string,
    @Param('ticketTypeId') ticketTypeId: string,
    @Body() body: { enabled: boolean },
    @CurrentUser() user: AuthenticatedUser
  ) {
    await this.assertTicketTypeOwnership(eventId, ticketTypeId, user.id)
    if (body.enabled) {
      await this.batchesService.enableBatchMode(ticketTypeId)
    } else {
      await this.batchesService.disableBatchMode(ticketTypeId)
    }
    return { success: true, enabled: body.enabled }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers de autorização
  // ─────────────────────────────────────────────────────────────────────────

  private async assertTicketTypeOwnership(
    eventId: string,
    ticketTypeId: string,
    userId: string
  ) {
    // eventsService.getEventDetails já valida dono/sócio
    await this.eventsService.getEventDetails(eventId, userId)
    // Verificar que o ticketType pertence ao evento
    // (proteção extra para não manipular ticket_types de outros eventos)
    const { data } = await this.batchesService['supabase']
      .getClient()
      .from('ticket_types')
      .select('id')
      .eq('id', ticketTypeId)
      .eq('event_id', eventId)
      .single()

    if (!data) {
      throw new Error('Tipo de ingresso não encontrado neste evento.')
    }
  }

  private async assertBatchOwnership(batchId: string, userId: string) {
    // Busca o ticket_type_id do lote, depois o event_id, depois valida ownership
    const supabase = this.batchesService['supabase'].getClient()

    const { data: batch } = await supabase
      .from('ticket_batches')
      .select('ticket_type_id')
      .eq('id', batchId)
      .single()

    if (!batch) throw new Error('Lote não encontrado.')

    const { data: ticketType } = await supabase
      .from('ticket_types')
      .select('event_id')
      .eq('id', (batch as any).ticket_type_id)
      .single()

    if (!ticketType) throw new Error('Tipo de ingresso não encontrado.')

    await this.eventsService.getEventDetails((ticketType as any).event_id, userId)
  }
}

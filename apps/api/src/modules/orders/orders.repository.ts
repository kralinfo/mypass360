import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'
import type { CreateOrderDto } from './dto/create-order.dto'
import { CustomFieldsService } from '@/modules/custom-fields/custom-fields.service'
import { TicketBatchesService } from '@/modules/ticket-batches/ticket-batches.service'

type OrderItemInsert = {
  order_id: string
  ticket_type_id: string
  ticket_batch_id?: string | null
  quantity: number
  unit_price: number
  nominee_names?: string[]
  nominee_cpfs?: string[]
  custom_answers: Record<string, string>[]
}

@Injectable()
export class OrdersRepository {
  private readonly table = 'orders'
  private readonly logger = new Logger(OrdersRepository.name)

  constructor(
    private readonly supabase: SupabaseService,
    private readonly customFields: CustomFieldsService,
    private readonly ticketBatchesService: TicketBatchesService
  ) {}

  async findById(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .select('*, order_items(*)')
      .eq('id', id)
      .single()

    if (error) {
      return null
    }

    return data
  }

  async create(dto: CreateOrderDto) {
    const client = this.supabase.getClient()

    // ── 1. Validar evento ────────────────────────────────────────────────────
    const { data: event, error: eventErrorFetch } = await client
      .from('events')
      .select('id, status, deletion_status, ticket_layout, participant_id_type, event_type')
      .eq('id', dto.eventId)
      .single()

    if (eventErrorFetch || !event) {
      throw new Error('Evento informado não foi encontrado.')
    }

    if (event.status !== 'published' || event.deletion_status === 'pending') {
      throw new Error('UNAVAILABLE_EVENT: Este evento está temporariamente indisponível para compras.')
    }

    // Eventos gratuitos não passam por este fluxo
    if (event.event_type === 'FREE') {
      throw new Error('UNAVAILABLE_EVENT: Eventos gratuitos utilizam o fluxo de inscrição, não o checkout.')
    }

    // ── 2. Validar nomes dos participantes ───────────────────────────────────
    const requiresNomineeName =
      event.ticket_layout === 'formal_pdf' || event.participant_id_type !== 'none'
    if (
      requiresNomineeName &&
      dto.items.some((item) =>
        Array.from({ length: item.quantity }, (_, index) => item.nomineeNames?.[index]?.trim()).some((name) => !name)
      )
    ) {
      throw new Error('MISSING_NOMINEE_NAME: Informe o nome de cada participante.')
    }

    // ── 3. Para cada item, resolver preço e estoque ──────────────────────────
    // REGRA DE SEGURANÇA: o frontend envia unitPrice como referência, mas o
    // backend sempre recalcula o preço real com base no ticket_type ou lote vigente.
    const resolvedItems: Array<{
      ticketTypeId: string
      batchId: string | null
      unitPrice: number
      quantity: number
      nomineeNames?: string[]
      nomineeCpfs?: string[]
    }> = []

    for (const item of dto.items) {
      // Buscar ticket_type para verificar batch_mode e preço padrão
      const { data: ticketType, error: ttErr } = await client
        .from('ticket_types')
        .select('id, price, quantity, sold, is_unlimited, batch_mode, event_id')
        .eq('id', item.ticketTypeId)
        .eq('event_id', dto.eventId)
        .single()

      if (ttErr || !ticketType) {
        throw new BadRequestException(`Tipo de ingresso '${item.ticketTypeId}' não encontrado neste evento.`)
      }

      if ((ticketType as any).batch_mode === true) {
        // ── Modo Lote: preço e estoque vêm do lote vigente ──────────────────
        const activeBatch = await this.ticketBatchesService.getActiveBatchInfo(item.ticketTypeId)

        if (!activeBatch) {
          throw new BadRequestException(
            'Não há ingressos disponíveis para este tipo de ingresso no momento.'
          )
        }

        // Verificar disponibilidade
        if (activeBatch.availableQty !== null && activeBatch.availableQty < item.quantity) {
          throw new BadRequestException(
            `Quantidade solicitada (${item.quantity}) excede o disponível (${activeBatch.availableQty}) no lote atual.`
          )
        }

        // Informar ao frontend se o preço diferiu do que foi enviado
        if (Math.abs(item.unitPrice - activeBatch.price) > 0.001) {
          this.logger.warn(
            `Preço de lote divergente para ticket_type ${item.ticketTypeId}: ` +
            `frontend enviou ${item.unitPrice}, lote vigente é ${activeBatch.price}. ` +
            `Usando preço do lote.`
          )
        }

        // Reservar estoque no lote
        await this.ticketBatchesService.reserveStock(activeBatch.batchId, item.quantity)

        resolvedItems.push({
          ticketTypeId: item.ticketTypeId,
          batchId: activeBatch.batchId,
          unitPrice: activeBatch.price, // SEMPRE o preço do backend
          quantity: item.quantity,
          nomineeNames: item.nomineeNames,
          nomineeCpfs: item.nomineeCpfs,
        })
      } else {
        // ── Modo Preço Único: validar estoque pelo campo sold/quantity ───────
        const tt = ticketType as any
        if (!tt.is_unlimited) {
          const available = tt.quantity - (tt.sold ?? 0)
          if (available < item.quantity) {
            throw new BadRequestException(
              `Ingressos insuficientes disponíveis. Disponível: ${available}, Solicitado: ${item.quantity}`
            )
          }
        }

        // Preço fixo do ticket_type (ignorando o que o frontend enviou)
        resolvedItems.push({
          ticketTypeId: item.ticketTypeId,
          batchId: null,
          unitPrice: Number(tt.price), // preço do banco, nunca do frontend
          quantity: item.quantity,
          nomineeNames: item.nomineeNames,
          nomineeCpfs: item.nomineeCpfs,
        })
      }
    }

    // ── 4. Validar campos personalizados ─────────────────────────────────────
    const validatedAnswers = await Promise.all(
      dto.items.map((item) => this.customFields.validateAnswers(dto.eventId, item.customAnswers, item.quantity))
    )

    // ── 5. Calcular total usando preços validados pelo backend ────────────────
    const total = resolvedItems.reduce<number>(
      (accumulator, item) => accumulator + item.quantity * item.unitPrice,
      0
    )

    // ── 6. Criar pedido ───────────────────────────────────────────────────────
    const { data: order, error: orderError } = await client
      .from(this.table)
      .insert({
        event_id: dto.eventId,
        user_id: dto.userId,
        status: 'pending',
        total,
      })
      .select('*')
      .single()

    if (orderError) {
      // Em caso de falha, liberar reservas de lote
      for (let i = 0; i < resolvedItems.length; i++) {
        const ri = resolvedItems[i]
        if (ri.batchId) {
          await this.ticketBatchesService.releaseReservation(ri.batchId, ri.quantity)
        }
      }
      throw new Error(orderError.message)
    }

    // ── 7. Inserir itens do pedido ────────────────────────────────────────────
    const itemsToInsert: OrderItemInsert[] = resolvedItems.map((ri, index) => ({
      order_id: order.id,
      ticket_type_id: ri.ticketTypeId,
      ticket_batch_id: ri.batchId,
      quantity: ri.quantity,
      unit_price: ri.unitPrice,
      nominee_names: ri.nomineeNames ?? [],
      nominee_cpfs: ri.nomineeCpfs ?? [],
      custom_answers: validatedAnswers[index],
    }))

    const { error: itemsError } = await this.supabase.getClient().from('order_items').insert(itemsToInsert)

    if (itemsError) {
      // Liberar reservas de lote em caso de falha
      for (const ri of resolvedItems) {
        if (ri.batchId) {
          await this.ticketBatchesService.releaseReservation(ri.batchId, ri.quantity)
        }
      }
      throw new Error(itemsError.message)
    }

    return order
  }

  /**
   * Cancela um pedido e libera as reservas de estoque dos lotes.
   * Chamado quando o pagamento é recusado ou o pedido expira.
   */
  async cancelAndReleaseStock(orderId: string): Promise<void> {
    const { data: items } = await this.supabase
      .getClient()
      .from('order_items')
      .select('id, ticket_batch_id, quantity')
      .eq('order_id', orderId)

    if (!items) return

    for (const item of items as any[]) {
      if (item.ticket_batch_id) {
        await this.ticketBatchesService.releaseReservation(item.ticket_batch_id, item.quantity)
      }
    }

    await this.supabase
      .getClient()
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', orderId)
  }
}

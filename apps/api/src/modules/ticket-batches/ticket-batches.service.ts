import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'
import type { CreateTicketBatchDto } from './dto/create-ticket-batch.dto'
import type { UpdateTicketBatchDto } from './dto/update-ticket-batch.dto'

export interface TicketBatch {
  id: string
  ticket_type_id: string
  name: string
  price: number
  quantity: number
  is_unlimited: boolean
  display_order: number
  status: 'future' | 'open' | 'sold_out' | 'closed'
  sold: number
  reserved: number
  created_at: string
  updated_at: string
}

export interface ActiveBatchInfo {
  batchId: string
  price: number
  availableQty: number | null // null = ilimitado
}

@Injectable()
export class TicketBatchesService {
  private readonly logger = new Logger(TicketBatchesService.name)

  constructor(private readonly supabase: SupabaseService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Listagem
  // ─────────────────────────────────────────────────────────────────────────

  async listBatches(ticketTypeId: string): Promise<TicketBatch[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .select('*')
      .eq('ticket_type_id', ticketTypeId)
      .order('display_order', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []) as TicketBatch[]
  }

  async listBatchesForEvent(eventId: string): Promise<TicketBatch[]> {
    // Busca todos os lotes de todos os ticket_types do evento
    const { data: types } = await this.supabase
      .getClient()
      .from('ticket_types')
      .select('id')
      .eq('event_id', eventId)
      .eq('batch_mode', true)

    if (!types || types.length === 0) return []

    const typeIds = types.map((t: any) => t.id)
    const { data, error } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .select('*')
      .in('ticket_type_id', typeIds)
      .order('display_order', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []) as TicketBatch[]
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Determinar lote vigente (chamado pelo checkout)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retorna o lote vigente e a quantidade disponível para um ticket_type
   * com batch_mode = TRUE. Retorna null se não há lote disponível.
   *
   * Esta função é a FONTE OFICIAL de preço e disponibilidade para checkout.
   * O frontend nunca deve enviar o preço — o backend o calcula aqui.
   */
  async getActiveBatchInfo(ticketTypeId: string): Promise<ActiveBatchInfo | null> {
    // Garantir que o lote está avançado se necessário
    await this.advanceBatchIfNeeded(ticketTypeId)

    const { data: batch, error } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .select('*')
      .eq('ticket_type_id', ticketTypeId)
      .eq('status', 'open')
      .order('display_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!batch) return null

    const b = batch as TicketBatch

    if (b.is_unlimited) {
      return { batchId: b.id, price: Number(b.price), availableQty: null }
    }

    const available = b.quantity - b.sold - b.reserved
    if (available <= 0) {
      // Lote esgotou — avançar e tentar novamente
      await this.advanceBatchIfNeeded(ticketTypeId)
      return this.getActiveBatchInfo(ticketTypeId)
    }

    return { batchId: b.id, price: Number(b.price), availableQty: available }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Reserva de estoque (ao criar pedido)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Reserva `qty` unidades do lote vigente de forma atômica.
   * Garante que a reserva não ultrapasse a capacidade do lote.
   * Lança exceção se não houver estoque suficiente.
   *
   * Usa UPDATE com WHERE ... AND (sold + reserved + qty) <= quantity
   * para prevenção de race condition em nível de banco.
   */
  async reserveStock(batchId: string, qty: number): Promise<void> {
    const { data: batch, error: fetchErr } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .select('*')
      .eq('id', batchId)
      .single()

    if (fetchErr || !batch) {
      throw new BadRequestException('Lote não encontrado.')
    }

    const b = batch as TicketBatch

    if (b.status !== 'open') {
      throw new BadRequestException(`Lote "${b.name}" não está disponível para venda.`)
    }

    if (!b.is_unlimited) {
      const available = b.quantity - b.sold - b.reserved
      if (available < qty) {
        throw new BadRequestException(
          `Estoque insuficiente no lote "${b.name}". Disponível: ${available}, Solicitado: ${qty}`
        )
      }

      // Incremento atômico via UPDATE condicional (previne race condition)
      const { error: updateErr } = await this.supabase
        .getClient()
        .from('ticket_batches')
        .update({ reserved: b.reserved + qty, updated_at: new Date().toISOString() })
        .eq('id', batchId)
        .eq('status', 'open')
        // Condição de segurança: verifica novamente que há estoque
        .lte('sold', b.quantity - qty - b.reserved)

      if (updateErr) {
        // Se o update falhou, provavelmente outra chamada concorrente consumiu o estoque
        throw new BadRequestException(
          `Não foi possível reservar estoque no lote "${b.name}". Tente novamente.`
        )
      }
    }
    // Se is_unlimited, não há reserva de quantidade
  }

  /**
   * Libera a reserva de estoque (pedido cancelado ou expirado).
   */
  async releaseReservation(batchId: string, qty: number): Promise<void> {
    const { data: batch } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .select('id, reserved, is_unlimited')
      .eq('id', batchId)
      .single()

    if (!batch || (batch as TicketBatch).is_unlimited) return

    const b = batch as TicketBatch
    const newReserved = Math.max(0, (b.reserved ?? 0) - qty)

    await this.supabase
      .getClient()
      .from('ticket_batches')
      .update({ reserved: newReserved, updated_at: new Date().toISOString() })
      .eq('id', batchId)

    // Após liberar reserva, verificar se um lote sold_out pode ser reaberto
    // (isto raramente acontece mas é importante para cancelamentos)
    await this.advanceBatchIfNeeded(
      ((await this.supabase.getClient().from('ticket_batches').select('ticket_type_id').eq('id', batchId).single()).data as any)?.ticket_type_id
    )
  }

  /**
   * Confirma venda: move de reserved para sold.
   * Chamado após pagamento aprovado.
   */
  async confirmSale(batchId: string, qty: number): Promise<void> {
    const { data: batch } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .select('*')
      .eq('id', batchId)
      .single()

    if (!batch) return

    const b = batch as TicketBatch

    if (b.is_unlimited) {
      // Apenas incrementa sold
      await this.supabase
        .getClient()
        .from('ticket_batches')
        .update({ sold: b.sold + qty, updated_at: new Date().toISOString() })
        .eq('id', batchId)
    } else {
      const newReserved = Math.max(0, b.reserved - qty)
      const newSold = b.sold + qty
      await this.supabase
        .getClient()
        .from('ticket_batches')
        .update({
          sold: newSold,
          reserved: newReserved,
          updated_at: new Date().toISOString(),
        })
        .eq('id', batchId)
    }

    // Verificar se lote esgotou e avançar
    await this.advanceBatchIfNeeded(b.ticket_type_id)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Avançar lote automaticamente
  // ─────────────────────────────────────────────────────────────────────────

  async advanceBatchIfNeeded(ticketTypeId: string): Promise<void> {
    if (!ticketTypeId) return

    // Chama a função PostgreSQL que já criamos na migration
    await this.supabase
      .getClient()
      .rpc('advance_batch_if_needed', { p_ticket_type_id: ticketTypeId })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CRUD de lotes (gestão pelo organizador)
  // ─────────────────────────────────────────────────────────────────────────

  async createBatch(
    ticketTypeId: string,
    dto: CreateTicketBatchDto
  ): Promise<TicketBatch> {
    // Buscar próxima ordem
    const { data: existing } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .select('display_order')
      .eq('ticket_type_id', ticketTypeId)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextOrder = (existing as any)?.display_order != null
      ? (existing as any).display_order + 1
      : 0

    // Verificar se já existe lote aberto para definir o status inicial
    const { data: openBatch } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .select('id')
      .eq('ticket_type_id', ticketTypeId)
      .eq('status', 'open')
      .limit(1)
      .maybeSingle()

    // Se não há lote aberto ainda, o primeiro criado abre automaticamente
    const initialStatus = openBatch ? 'future' : 'open'

    const { data, error } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .insert({
        ticket_type_id: ticketTypeId,
        name: dto.name,
        price: dto.price,
        quantity: dto.quantity ?? 0,
        is_unlimited: dto.is_unlimited ?? false,
        display_order: dto.display_order ?? nextOrder,
        status: initialStatus,
        sold: 0,
        reserved: 0,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return data as TicketBatch
  }

  async updateBatch(
    batchId: string,
    dto: UpdateTicketBatchDto,
    requesterId?: string
  ): Promise<TicketBatch> {
    const { data: current, error: fetchErr } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .select('*')
      .eq('id', batchId)
      .single()

    if (fetchErr || !current) {
      throw new NotFoundException(`Lote '${batchId}' não encontrado`)
    }

    const b = current as TicketBatch

    // Validação de segurança: não reduzir quantity abaixo do vendido + reservado
    if (dto.quantity !== undefined && !dto.is_unlimited) {
      const minQty = b.sold + b.reserved
      if (dto.quantity < minQty) {
        throw new BadRequestException(
          `Não é possível definir quantidade ${dto.quantity}. ` +
          `Já existem ${b.sold} vendidos e ${b.reserved} reservados (total: ${minQty}).`
        )
      }
    }

    // Não permitir alterar preço de lotes com pedidos pending (reserved > 0)
    // sem forçar — informamos o organizador
    if (dto.price !== undefined && dto.price !== b.price && b.reserved > 0) {
      this.logger.warn(
        `Lote ${batchId}: preço alterado de ${b.price} para ${dto.price} ` +
        `com ${b.reserved} reservas ativas. As reservas ativas manterão o preço original.`
      )
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }
    if (dto.name !== undefined) updatePayload.name = dto.name
    if (dto.price !== undefined) updatePayload.price = dto.price
    if (dto.quantity !== undefined) updatePayload.quantity = dto.quantity
    if (dto.is_unlimited !== undefined) updatePayload.is_unlimited = dto.is_unlimited
    if (dto.status !== undefined) {
      // Não permitir reabrir lote sold_out se não houver capacidade
      if (dto.status === 'open' && b.status === 'sold_out' && !b.is_unlimited) {
        const available = (dto.quantity ?? b.quantity) - b.sold - b.reserved
        if (available <= 0) {
          throw new BadRequestException(
            'Não é possível reabrir um lote esgotado sem aumentar a quantidade.'
          )
        }
      }
      if (dto.status === 'open') {
        // Ao abrir este lote, qualquer outro lote 'open' do mesmo tipo volta para 'future'
        await this.supabase
          .getClient()
          .from('ticket_batches')
          .update({ status: 'future', updated_at: new Date().toISOString() })
          .eq('ticket_type_id', b.ticket_type_id)
          .eq('status', 'open')
          .neq('id', batchId)
      }
      updatePayload.status = dto.status
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .update(updatePayload)
      .eq('id', batchId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return data as TicketBatch
  }

  /**
   * Reabre um lote anterior (esgotado ou encerrado), permitindo ao organizador
   * voltar para ele e aumentar a quantidade de ingressos.
   *
   * Ao reabrir:
   * 1. Valida que a nova quantidade é maior que o já vendido + reservado (se não for ilimitado).
   * 2. Qualquer outro lote do mesmo ticket_type que esteja 'open' é revertido para 'future'.
   * 3. O lote alvo é atualizado com status 'open', nova quantidade e preço (se alterados).
   */
  async reopenBatch(
    batchId: string,
    dto?: { quantity?: number; price?: number; is_unlimited?: boolean }
  ): Promise<TicketBatch> {
    const { data: batch, error: fetchErr } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .select('*')
      .eq('id', batchId)
      .single()

    if (fetchErr || !batch) {
      throw new NotFoundException(`Lote '${batchId}' não encontrado`)
    }

    const b = batch as TicketBatch

    const isUnlimited = dto?.is_unlimited ?? b.is_unlimited
    const newQty = dto?.quantity !== undefined ? dto.quantity : b.quantity
    const newPrice = dto?.price !== undefined ? dto.price : b.price

    if (!isUnlimited) {
      const minRequired = b.sold + b.reserved
      if (newQty <= minRequired) {
        throw new BadRequestException(
          `Para reabrir o lote "${b.name}", a quantidade total (${newQty}) deve ser maior que os ingressos já vendidos e reservados (${minRequired}).`
        )
      }
    }

    if (newPrice < 0) {
      throw new BadRequestException('O preço do lote não pode ser negativo.')
    }

    // 1. Reverter qualquer outro lote que esteja 'open' deste mesmo tipo de ingresso para 'future'
    const { error: revertErr } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .update({ status: 'future', updated_at: new Date().toISOString() })
      .eq('ticket_type_id', b.ticket_type_id)
      .eq('status', 'open')
      .neq('id', batchId)

    if (revertErr) {
      this.logger.error(`Erro ao reverter lotes abertos para future: ${revertErr.message}`)
    }

    // 2. Reabrir o lote alvo como 'open'
    const { data: updated, error: updateErr } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .update({
        status: 'open',
        quantity: isUnlimited ? 0 : newQty,
        is_unlimited: isUnlimited,
        price: newPrice,
        updated_at: new Date().toISOString(),
      })
      .eq('id', batchId)
      .select('*')
      .single()

    if (updateErr || !updated) {
      throw new Error(updateErr?.message || 'Erro ao reabrir lote')
    }

    this.logger.log(
      `Lote ${b.name} (${batchId}) reaberto com sucesso como lote vigente. ` +
      `Nova capacidade: ${isUnlimited ? 'ilimitada' : newQty}, preço: ${newPrice}.`
    )

    return updated as TicketBatch
  }

  /**
   * Encerra um lote (status → closed).
   * Lotes com sold > 0 podem ser encerrados mas NÃO deletados.
   * Ao encerrar, o próximo lote future é aberto automaticamente.
   */
  async closeBatch(batchId: string): Promise<TicketBatch> {
    const { data: batch, error: fetchErr } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .select('*')
      .eq('id', batchId)
      .single()

    if (fetchErr || !batch) {
      throw new NotFoundException(`Lote '${batchId}' não encontrado`)
    }

    const b = batch as TicketBatch

    const { data, error } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', batchId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)

    // Avançar para o próximo lote
    await this.advanceBatchIfNeeded(b.ticket_type_id)

    return data as TicketBatch
  }

  /**
   * Deleta um lote APENAS se não tiver vendas ou reservas.
   * Lotes com histórico são preservados.
   */
  async deleteBatch(batchId: string): Promise<void> {
    const { data: batch, error: fetchErr } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .select('*')
      .eq('id', batchId)
      .single()

    if (fetchErr || !batch) {
      throw new NotFoundException(`Lote '${batchId}' não encontrado`)
    }

    const b = batch as TicketBatch

    if (b.sold > 0) {
      throw new BadRequestException(
        `O lote "${b.name}" possui ${b.sold} ingresso(s) vendido(s) e não pode ser excluído. ` +
        `Use a opção "Encerrar lote" para fechá-lo.`
      )
    }

    if (b.reserved > 0) {
      throw new BadRequestException(
        `O lote "${b.name}" possui ${b.reserved} reserva(s) ativa(s) e não pode ser excluído.`
      )
    }

    const { error } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .delete()
      .eq('id', batchId)

    if (error) throw new Error(error.message)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Ativar/desativar batch_mode em um ticket_type
  // ─────────────────────────────────────────────────────────────────────────

  async enableBatchMode(ticketTypeId: string): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from('ticket_types')
      .update({ batch_mode: true })
      .eq('id', ticketTypeId)

    if (error) throw new Error(error.message)
  }

  async disableBatchMode(ticketTypeId: string): Promise<void> {
    // Verificar se há vendas em andamento nos lotes
    const { data: activeBatches } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .select('id, sold, reserved, name')
      .eq('ticket_type_id', ticketTypeId)
      .gt('reserved', 0)

    if (activeBatches && activeBatches.length > 0) {
      const names = (activeBatches as any[]).map((b) => b.name).join(', ')
      throw new BadRequestException(
        `Não é possível desativar lotes com reservas ativas: ${names}. ` +
        `Aguarde a conclusão ou cancelamento dos pedidos pendentes.`
      )
    }

    const { error } = await this.supabase
      .getClient()
      .from('ticket_types')
      .update({ batch_mode: false })
      .eq('id', ticketTypeId)

    if (error) throw new Error(error.message)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Sincronizar lote a partir do order_item (para lookup reverso)
  // ─────────────────────────────────────────────────────────────────────────

  async getBatchForOrderItem(orderItemId: string): Promise<TicketBatch | null> {
    const { data: item } = await this.supabase
      .getClient()
      .from('order_items')
      .select('ticket_batch_id')
      .eq('id', orderItemId)
      .single()

    if (!item || !(item as any).ticket_batch_id) return null

    const { data: batch } = await this.supabase
      .getClient()
      .from('ticket_batches')
      .select('*')
      .eq('id', (item as any).ticket_batch_id)
      .single()

    return batch as TicketBatch | null
  }
}

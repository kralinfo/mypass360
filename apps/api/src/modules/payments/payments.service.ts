import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PaymentsRepository } from './payments.repository'
import type { CreatePaymentDto } from './dto/create-payment.dto'
import type { CreatePreferenceDto } from './dto/create-preference.dto'
import { MercadoPagoGatewayService } from './payment-gateway.service'
import { TicketsService } from '../tickets/tickets.service'
import { PaymentMailService } from './payment-mail.service'
import { SupabaseService } from '@/common/supabase/supabase.service'
import { randomUUID } from 'crypto'

interface MercadoPagoWebhookPayload {
  action?: string
  type?: string
  data?: {
    id?: string
  }
  id?: string
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)

  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly paymentGateway: MercadoPagoGatewayService,
    private readonly ticketsService: TicketsService,
    private readonly paymentMailService: PaymentMailService,
    private readonly supabase: SupabaseService,
  ) {}

  async findById(id: string) {
    const payment = await this.paymentsRepository.findById(id)
    if (!payment) {
      throw new NotFoundException(`Pagamento '${id}' não encontrado`)
    }
    return payment
  }

  async findByOrderId(orderId: string) {
    return this.paymentsRepository.findLatestByOrderId(orderId)
  }

  /**
   * Busca o status real do pagamento no Mercado Pago e, se aprovado,
   * confirma no banco e gera os ingressos sem depender de webhook.
   * Chamado pelo polling do frontend a cada 5s enquanto status === 'pending'.
   */
  async syncPaymentStatus(paymentId: string) {
    const payment = await this.paymentsRepository.findById(paymentId)
    if (!payment) throw new NotFoundException(`Pagamento '${paymentId}' não encontrado`)

    // Já confirmado — retornar direto sem consultar MP
    if (payment.status !== 'pending') return payment

    // Sem externalId real do MP não há o que consultar
    if (!payment.external_id || payment.external_id.startsWith('manual_') || payment.external_id.startsWith('pix_')) {
      return payment
    }

    try {
      // Estratégia 1: buscar por payment ID (funciona para PIX direto)
      let mpStatus = await this.paymentGateway.fetchPaymentStatus(payment.external_id)

      // Estratégia 2: buscar por external_reference/orderId (funciona para Checkout Pro)
      // No Checkout Pro, external_id é o preferenceId, não o paymentId
      if (!mpStatus) {
        mpStatus = await this.paymentGateway.fetchPaymentStatusByOrderId(payment.order_id)
      }

      this.logger.debug(`MP status para payment=${payment.id}, order=${payment.order_id}: ${mpStatus}`)

      if (mpStatus === 'approved') {
        const confirmed = await this.paymentsRepository.confirm(payment.id)

        // null = outra chamada concorrente (webhook) já confirmou — não duplicar ingressos
        if (!confirmed) {
          return this.paymentsRepository.findById(payment.id)
        }

        await this.generateTicketsForOrder(confirmed.order_id)
        await this.paymentMailService.sendOrderTicketsEmail(confirmed.order_id)
        this.logger.log(`Pagamento ${payment.id} sincronizado e confirmado via polling (sem webhook)`)
        return confirmed
      }

      if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
        return this.paymentsRepository.updateStatusById(payment.id, 'rejected')
      }
    } catch (err) {
      this.logger.warn(`Falha ao sincronizar status com MP para ${payment.id}: ${err instanceof Error ? err.message : String(err)}`)
    }

    return payment
  }

  /**
   * Reconcilia todos os pagamentos pendentes consultando o MP.
   * Pode ser chamado via endpoint admin para recuperar pagamentos perdidos.
   */
  async reconcilePendingPayments() {
    const pending = await this.paymentsRepository.findAllPending(100)

    if (!pending.length) return { reconciled: 0, total: 0 }

    let reconciled = 0
    for (const p of pending) {
      try {
        const updated = await this.syncPaymentStatus(p.id)
        if (updated?.status === 'approved') reconciled++
      } catch {
        // continua para o próximo
      }
    }

    this.logger.log(`Reconciliação: ${reconciled}/${pending.length} pagamentos pendentes confirmados`)
    return { reconciled, total: pending.length }
  }

  async create(dto: CreatePaymentDto) {
    const initializationData =
      dto.provider === 'pix'
        ? await this.paymentGateway.createPixPayment(dto)
        : {
            externalId: dto.externalId ?? `payment_${randomUUID()}`,
            pixCode: null,
            pixExpiresAt: null,
          }

    return this.paymentsRepository.create(dto, initializationData)
  }

  async confirm(id: string) {
    const payment = await this.paymentsRepository.findById(id)

    if (!payment) {
      throw new NotFoundException(`Pagamento '${id}' não encontrado`)
    }

    const confirmed = await this.paymentsRepository.confirm(id)

    // null = já confirmado por outra chamada concorrente — não duplicar ingressos
    if (!confirmed) {
      return this.paymentsRepository.findById(id)
    }

    // Gerar tickets após confirmação
    await this.generateTicketsForOrder(confirmed.order_id)
    await this.paymentMailService.sendOrderTicketsEmail(confirmed.order_id)

    return confirmed
  }

  async createPreference(dto: CreatePreferenceDto) {
    const preference = await this.paymentGateway.createCheckoutPreference(dto)

    await this.paymentsRepository.createPendingCheckoutPreference({
      orderId: dto.orderId,
      amount: dto.amount,
      externalId: preference.preferenceId,
    })

    return preference
  }

  async handleMercadoPagoWebhook(payload: MercadoPagoWebhookPayload) {
    const externalId = payload.data?.id ?? payload.id

    if (!externalId) {
      return { received: true, processed: false }
    }

    const payment = await this.paymentsRepository.findByExternalId(String(externalId))

    if (!payment) {
      return { received: true, processed: false }
    }

    const status = await this.paymentGateway.fetchPaymentStatus(String(externalId))

    if (status === 'approved') {
      const updated = await this.paymentsRepository.confirmByExternalId(String(externalId))

      // Gerar tickets após webhook do Mercado Pago
      if (updated) {
        await this.generateTicketsForOrder(updated.order_id)
        await this.paymentMailService.sendOrderTicketsEmail(updated.order_id)
      }

      return { received: true, processed: true, payment: updated }
    }

    if (status === 'rejected' || status === 'cancelled') {
      const updated = await this.paymentsRepository.updateStatusById(payment.id, 'rejected')
      return { received: true, processed: true, payment: updated }
    }

    return { received: true, processed: true, payment }
  }

  /**
   * Confirmação manual de pagamento para ambiente de desenvolvimento.
   * Executa EXATAMENTE o mesmo fluxo da confirmação oficial do Mercado Pago.
   *
   * TODO: Remover quando a integração oficial do Mercado Pago estiver concluída.
   * Também remover: ManualConfirmationDto, endpoint POST /payments/manual-confirmation
   *
   * @param orderId - UUID do pedido
   * @param code - Código de confirmação (aceito: "mypass360pg")
   */
  async manualConfirmation(orderId: string, code: string) {
    // TODO: Remover quando a integração oficial do Mercado Pago estiver concluída.
    const VALID_CODE = 'mypass360pg'

    if (code !== VALID_CODE) {
      throw new BadRequestException('Código de confirmação inválido.')
    }

    // Buscar QUALQUER pagamento para este pedido (independente do status)
    const { data: payment } = await this.supabase
      .getClient()
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // Caso 1: Pagamento já aprovado → apenas garantir que os tickets foram gerados
    if (payment?.status === 'approved') {
      this.logger.log(`[DEV] Pedido ${orderId} já aprovado — garantindo geração de tickets`)
      await this.generateTicketsForOrder(orderId)
      await this.paymentMailService.sendOrderTicketsEmail(orderId)
      return payment
    }

    // Caso 2: Pagamento pendente → confirmar normalmente
    if (payment?.status === 'pending') {
      const confirmed = await this.paymentsRepository.confirm(payment.id)

      if (!confirmed) {
        this.logger.log(`[DEV] Pagamento ${payment.id} já havia sido confirmado por outra chamada`)
        return this.paymentsRepository.findById(payment.id)
      }

      await this.generateTicketsForOrder(orderId)
      await this.paymentMailService.sendOrderTicketsEmail(orderId)
      this.logger.log(`[DEV] Pagamento ${payment.id} confirmado manualmente para pedido ${orderId}`)
      return confirmed
    }

    // Caso 3: Nenhum pagamento existe ainda → criar um e confirmar imediatamente
    // (usuário não passou pelo fluxo normal de checkout)
    this.logger.log(`[DEV] Nenhum pagamento encontrado para pedido ${orderId} — criando e confirmando`)

    // Buscar o total do pedido para criar o pagamento
    const { data: order } = await this.supabase
      .getClient()
      .from('orders')
      .select('total')
      .eq('id', orderId)
      .single()

    if (!order) {
      throw new NotFoundException(`Pedido '${orderId}' não encontrado`)
    }

    const newPayment = await this.paymentsRepository.create(
      {
        orderId,
        provider: 'pix',
        amount: order.total,
        payerEmail: 'dev@mypass360.com',  // placeholder para fluxo manual
        payerDocument: '00000000000',       // placeholder para fluxo manual
      },
      {
        externalId: `manual_${orderId}`,
        pixCode: null,
        pixExpiresAt: null,
      }
    )

    const confirmed = await this.paymentsRepository.confirm(newPayment.id)
    await this.generateTicketsForOrder(orderId)
    await this.paymentMailService.sendOrderTicketsEmail(orderId)
    this.logger.log(`[DEV] Pagamento manual criado e confirmado para pedido ${orderId}`)

    return confirmed
  }


  /**
   * Busca os order_items do pedido e gera um ticket por unidade adquirida.
   * Chamado tanto pelo webhook oficial quanto pela confirmação manual.
   */
  private async generateTicketsForOrder(orderId: string) {
    try {
      // Buscar pedido com items e dados do comprador
      const { data: order, error: orderError } = await this.supabase
        .getClient()
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            ticket_type_id,
            quantity,
            unit_price,
            nominee_names,
            nominee_cpfs,
            ticket_types (
              id,
              name,
              description
            )
          )
        `)
        .eq('id', orderId)
        .single()

      if (orderError || !order) {
        this.logger.error(`Pedido '${orderId}' não encontrado ao gerar tickets`)
        return
      }

      // Buscar email e nome do comprador
      const { data: userData } = await this.supabase
        .getClient()
        .auth.admin.getUserById(order.user_id)

      const userEmail = userData?.user?.email ?? ''
      const userMeta = userData?.user?.user_metadata as Record<string, string> | undefined
      const buyerDisplayName = userMeta?.full_name ?? userMeta?.name ?? userEmail

      const orderItems = (order.order_items ?? []).map((item: any) => ({
        id: item.id,
        ticketTypeId: item.ticket_type_id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        ticketTypeName: item.ticket_types?.name,
        ticketTypeDescription: item.ticket_types?.description,
        nomineeNames: item.nominee_names,
        nomineeCpfs: item.nominee_cpfs,
      }))

      const tickets = await this.ticketsService.generateForOrder(
        orderId,
        order.user_id,
        userEmail,
        orderItems,
        order.event_id,
        buyerDisplayName
      )

      this.logger.log(`${tickets.length} ticket(s) gerado(s) para o pedido ${orderId}`)
    } catch (err) {
      this.logger.error(
        `Erro ao gerar tickets para pedido ${orderId}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}

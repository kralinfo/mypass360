import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { CreatePaymentDto } from './dto/create-payment.dto'
import { CreatePreferenceDto } from './dto/create-preference.dto'
import { ManualConfirmationDto } from './dto/manual-confirmation.dto'

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // IMPORTANTE: rotas estáticas devem vir ANTES de rotas parametrizadas (:id)

  @Get('by-order/:orderId')
  findByOrderId(@Param('orderId') orderId: string) {
    return this.paymentsService.findByOrderId(orderId)
  }

  /**
   * Reconcilia TODOS os pagamentos pendentes consultando o MP.
   * Use quando o webhook falhou (API_PUBLIC_URL não configurado).
   */
  @Post('reconcile')
  @HttpCode(200)
  reconcilePendingPayments() {
    return this.paymentsService.reconcilePendingPayments()
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.paymentsService.findById(id)
  }

  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto)
  }

  @Post(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.paymentsService.confirm(id)
  }

  /**
   * Sincroniza o status do pagamento com o Mercado Pago em tempo real.
   * Chamado pelo polling do frontend — não depende de webhook.
   */
  @Post(':id/sync')
  @HttpCode(200)
  syncPaymentStatus(@Param('id') id: string) {
    return this.paymentsService.syncPaymentStatus(id)
  }

  @Post('preference')
  createPreference(@Body() dto: CreatePreferenceDto) {
    return this.paymentsService.createPreference(dto)
  }

  @Post('webhook/mercadopago')
  @HttpCode(200)
  handleMercadoPagoWebhook(@Body() body: Record<string, unknown>) {
    return this.paymentsService.handleMercadoPagoWebhook(body)
  }

  /**
   * Endpoint temporário para confirmação manual de pagamento em desenvolvimento.
   * TODO: Remover quando a integração oficial do Mercado Pago estiver concluída.
   */
  @Post('manual-confirmation')
  @HttpCode(200)
  manualConfirmation(@Body() dto: ManualConfirmationDto) {
    return this.paymentsService.manualConfirmation(dto.orderId, dto.code)
  }
}

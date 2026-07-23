import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { CreatePaymentDto } from './dto/create-payment.dto'
import { CreatePreferenceDto } from './dto/create-preference.dto'
import { ManualConfirmationDto } from './dto/manual-confirmation.dto'

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

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
   * Aceita o código "mypass360pg" e executa o mesmo fluxo da confirmação oficial.
   *
   * TODO: Remover quando a integração oficial do Mercado Pago estiver concluída.
   * Também remover: ManualConfirmationDto, método manualConfirmation() em PaymentsService
   */
  @Post('manual-confirmation')
  @HttpCode(200)
  manualConfirmation(@Body() dto: ManualConfirmationDto) {
    // TODO: Remover quando a integração oficial do Mercado Pago estiver concluída.
    return this.paymentsService.manualConfirmation(dto.orderId, dto.code)
  }
}

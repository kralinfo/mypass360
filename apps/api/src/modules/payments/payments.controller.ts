import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { CreatePaymentDto } from './dto/create-payment.dto'
import { CreatePreferenceDto } from './dto/create-preference.dto'

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
}

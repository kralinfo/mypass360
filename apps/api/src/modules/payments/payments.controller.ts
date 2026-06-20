import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { CreatePaymentDto } from './dto/create-payment.dto'

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
}

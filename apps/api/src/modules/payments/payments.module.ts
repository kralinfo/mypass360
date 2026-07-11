import { Module } from '@nestjs/common'
import { PaymentsController } from './payments.controller'
import { PaymentsRepository } from './payments.repository'
import { PaymentsService } from './payments.service'
import { MercadoPagoGatewayService } from './payment-gateway.service'

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository, MercadoPagoGatewayService],
})
export class PaymentsModule {}

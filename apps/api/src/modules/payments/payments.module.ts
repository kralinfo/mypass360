import { Module } from '@nestjs/common'
import { PaymentsController } from './payments.controller'
import { PaymentsRepository } from './payments.repository'
import { PaymentsService } from './payments.service'
import { MercadoPagoGatewayService } from './payment-gateway.service'
import { TicketsModule } from '../tickets/tickets.module'

@Module({
  imports: [TicketsModule], // Para injetar TicketsService no PaymentsService
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository, MercadoPagoGatewayService],
})
export class PaymentsModule {}

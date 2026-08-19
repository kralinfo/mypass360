import { Module } from '@nestjs/common'
import { PaymentsController } from './payments.controller'
import { PaymentsRepository } from './payments.repository'
import { PaymentsService } from './payments.service'
import { MercadoPagoGatewayService } from './payment-gateway.service'
import { TicketsModule } from '../tickets/tickets.module'
import { MailModule } from '@/common/mail/mail.module'
import { PaymentMailService } from './payment-mail.service'

@Module({
  imports: [TicketsModule, MailModule], // Para injetar TicketsService e MailService no PaymentsService
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository, MercadoPagoGatewayService, PaymentMailService],
})
export class PaymentsModule {}

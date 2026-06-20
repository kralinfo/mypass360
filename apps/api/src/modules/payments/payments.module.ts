import { Module } from '@nestjs/common'
import { PaymentsController } from './payments.controller'
import { PaymentsRepository } from './payments.repository'
import { PaymentsService } from './payments.service'

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}

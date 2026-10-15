import { Module } from '@nestjs/common'
import { OrdersController } from './orders.controller'
import { OrdersRepository } from './orders.repository'
import { OrdersService } from './orders.service'
import { TicketBatchesModule } from '@/modules/ticket-batches/ticket-batches.module'
import { CustomFieldsModule } from '@/modules/custom-fields/custom-fields.module'

@Module({
  imports: [TicketBatchesModule, CustomFieldsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}

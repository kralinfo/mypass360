import { Module } from '@nestjs/common'
import { OrdersController } from './orders.controller'
import { OrdersRepository } from './orders.repository'
import { OrdersService } from './orders.service'

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
})
export class OrdersModule {}

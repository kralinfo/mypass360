import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { OrdersService } from './orders.service'
import { CreateOrderDto } from './dto/create-order.dto'

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.ordersService.findById(id)
  }

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto)
  }
}

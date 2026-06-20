import { Injectable, NotFoundException } from '@nestjs/common'
import { OrdersRepository } from './orders.repository'
import type { CreateOrderDto } from './dto/create-order.dto'

@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async findById(id: string) {
    const order = await this.ordersRepository.findById(id)
    if (!order) {
      throw new NotFoundException(`Pedido '${id}' não encontrado`)
    }
    return order
  }

  create(dto: CreateOrderDto) {
    return this.ordersRepository.create(dto)
  }
}

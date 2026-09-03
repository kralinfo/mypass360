import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'

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

  async create(dto: CreateOrderDto) {
    try {
      return await this.ordersRepository.create(dto)
    } catch (err: unknown) {
      if (err instanceof Error && err.message.startsWith('UNAVAILABLE_EVENT')) {
        throw new BadRequestException('Este evento está temporariamente indisponível para compras.')
      }
      throw err
    }
  }
}

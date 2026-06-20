import { Injectable } from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'
import type { CreateOrderDto } from './dto/create-order.dto'

type OrderItemInsert = {
  order_id: string
  ticket_type_id: string
  quantity: number
  unit_price: number
}

@Injectable()
export class OrdersRepository {
  private readonly table = 'orders'

  constructor(private readonly supabase: SupabaseService) {}

  async findById(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .select('*, order_items(*)')
      .eq('id', id)
      .single()

    if (error) {
      return null
    }

    return data
  }

  async create(dto: CreateOrderDto) {
    const total = dto.items.reduce<number>(
      (accumulator, item) => accumulator + item.quantity * item.unitPrice,
      0
    )

    const { data: order, error: orderError } = await this.supabase
      .getClient()
      .from(this.table)
      .insert({
        event_id: dto.eventId,
        user_id: dto.userId,
        status: 'pending',
        total,
      })
      .select('*')
      .single()

    if (orderError) {
      throw new Error(orderError.message)
    }

    const itemsToInsert: OrderItemInsert[] = dto.items.map((item) => ({
      order_id: order.id,
      ticket_type_id: item.ticketTypeId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    }))

    const { error: itemsError } = await this.supabase.getClient().from('order_items').insert(itemsToInsert)

    if (itemsError) {
      throw new Error(itemsError.message)
    }

    return order
  }
}

import { Injectable } from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'
import type { CreatePaymentDto } from './dto/create-payment.dto'

@Injectable()
export class PaymentsRepository {
  private readonly table = 'payments'

  constructor(private readonly supabase: SupabaseService) {}

  async findById(id: string) {
    const { data, error } = await this.supabase.getClient().from(this.table).select('*').eq('id', id).single()

    if (error) {
      return null
    }

    return data
  }

  async create(dto: CreatePaymentDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .insert({
        order_id: dto.orderId,
        provider: dto.provider,
        amount: dto.amount,
        status: 'pending',
        external_id: dto.externalId,
      })
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }
}

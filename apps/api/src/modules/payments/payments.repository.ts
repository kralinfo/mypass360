import { Injectable } from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'
import type { CreatePaymentDto } from './dto/create-payment.dto'
import { randomUUID } from 'crypto'

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
    const isPix = dto.provider === 'pix'
    const externalId = dto.externalId ?? `pix_${randomUUID()}`
    const pixCode = isPix
      ? `00020126580014BR.GOV.BCB.PIX0136${externalId}520400005303986540${dto.amount.toFixed(2)}5802BR5925MYPASS3606009SAO PAULO62070503***6304ABCD`
      : null
    const pixExpiresAt = isPix ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null

    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .insert({
        order_id: dto.orderId,
        provider: dto.provider,
        amount: dto.amount,
        status: 'pending',
        external_id: externalId,
        pix_code: pixCode,
        pix_expires_at: pixExpiresAt,
      })
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  async confirm(id: string) {
    const { data: payment, error: paymentError } = await this.supabase
      .getClient()
      .from(this.table)
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()

    if (paymentError) {
      throw new Error(paymentError.message)
    }

    const { error: orderError } = await this.supabase
      .getClient()
      .from('orders')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', payment.order_id)

    if (orderError) {
      throw new Error(orderError.message)
    }

    return payment
  }
}

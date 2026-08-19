import { Injectable } from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'
import type { CreatePaymentDto } from './dto/create-payment.dto'

export interface PaymentInitializationData {
  externalId: string
  pixCode: string | null
  pixExpiresAt: string | null
}

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

  async findByExternalId(externalId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .select('*')
      .eq('external_id', externalId)
      .single()

    if (error) {
      return null
    }

    return data
  }

  async findLatestByOrderId(orderId: string) {
    const { data } = await this.supabase
      .getClient()
      .from(this.table)
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return data ?? null
  }

  async updateStatusById(id: string, status: 'pending' | 'approved' | 'rejected' | 'refunded') {
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  async create(dto: CreatePaymentDto, initializationData: PaymentInitializationData) {
    const isPix = dto.provider === 'pix'

    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .insert({
        order_id: dto.orderId,
        provider: dto.provider,
        amount: dto.amount,
        status: 'pending',
        external_id: initializationData.externalId,
        pix_code: isPix ? initializationData.pixCode : null,
        pix_expires_at: isPix ? initializationData.pixExpiresAt : null,
      })
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  async createPendingCheckoutPreference(params: { orderId: string; amount: number; externalId: string }) {
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .insert({
        order_id: params.orderId,
        provider: 'pix',
        amount: params.amount,
        status: 'pending',
        external_id: params.externalId,
        pix_code: null,
        pix_expires_at: null,
      })
      .select('*')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  async confirm(id: string) {
    const payment = await this.updateStatusById(id, 'approved')

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

  async confirmByExternalId(externalId: string) {
    const payment = await this.findByExternalId(externalId)

    if (!payment) {
      return null
    }

    return this.confirm(payment.id)
  }
}

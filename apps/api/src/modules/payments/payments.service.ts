import { Injectable, NotFoundException } from '@nestjs/common'
import { PaymentsRepository } from './payments.repository'
import type { CreatePaymentDto } from './dto/create-payment.dto'
import type { CreatePreferenceDto } from './dto/create-preference.dto'
import { MercadoPagoGatewayService } from './payment-gateway.service'
import { randomUUID } from 'crypto'

interface MercadoPagoWebhookPayload {
  action?: string
  type?: string
  data?: {
    id?: string
  }
  id?: string
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly paymentGateway: MercadoPagoGatewayService
  ) {}

  async findById(id: string) {
    const payment = await this.paymentsRepository.findById(id)
    if (!payment) {
      throw new NotFoundException(`Pagamento '${id}' não encontrado`)
    }
    return payment
  }

  async create(dto: CreatePaymentDto) {
    const initializationData =
      dto.provider === 'pix'
        ? await this.paymentGateway.createPixPayment(dto)
        : {
            externalId: dto.externalId ?? `payment_${randomUUID()}`,
            pixCode: null,
            pixExpiresAt: null,
          }

    return this.paymentsRepository.create(dto, initializationData)
  }

  async confirm(id: string) {
    const payment = await this.paymentsRepository.findById(id)

    if (!payment) {
      throw new NotFoundException(`Pagamento '${id}' não encontrado`)
    }

    return this.paymentsRepository.confirm(id)
  }

  async createPreference(dto: CreatePreferenceDto) {
    const preference = await this.paymentGateway.createCheckoutPreference(dto)

    await this.paymentsRepository.createPendingCheckoutPreference({
      orderId: dto.orderId,
      amount: dto.amount,
      externalId: preference.preferenceId,
    })

    return preference
  }

  async handleMercadoPagoWebhook(payload: MercadoPagoWebhookPayload) {
    const externalId = payload.data?.id ?? payload.id

    if (!externalId) {
      return { received: true, processed: false }
    }

    const payment = await this.paymentsRepository.findByExternalId(String(externalId))

    if (!payment) {
      return { received: true, processed: false }
    }

    const status = await this.paymentGateway.fetchPaymentStatus(String(externalId))

    if (status === 'approved') {
      const updated = await this.paymentsRepository.confirmByExternalId(String(externalId))
      return { received: true, processed: true, payment: updated }
    }

    if (status === 'rejected' || status === 'cancelled') {
      const updated = await this.paymentsRepository.updateStatusById(payment.id, 'rejected')
      return { received: true, processed: true, payment: updated }
    }

    return { received: true, processed: true, payment }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common'
import { PaymentsRepository } from './payments.repository'
import type { CreatePaymentDto } from './dto/create-payment.dto'

@Injectable()
export class PaymentsService {
  constructor(private readonly paymentsRepository: PaymentsRepository) {}

  async findById(id: string) {
    const payment = await this.paymentsRepository.findById(id)
    if (!payment) {
      throw new NotFoundException(`Pagamento '${id}' não encontrado`)
    }
    return payment
  }

  create(dto: CreatePaymentDto) {
    return this.paymentsRepository.create(dto)
  }
}

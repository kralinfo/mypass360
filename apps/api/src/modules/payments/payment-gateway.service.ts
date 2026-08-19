import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MercadoPagoConfig, Payment as MercadoPagoPayment, Preference } from 'mercadopago'
import { randomUUID } from 'crypto'
import type { CreatePaymentDto } from './dto/create-payment.dto'
import type { CreatePreferenceDto } from './dto/create-preference.dto'
import type { PaymentInitializationData } from './payments.repository'

export interface CheckoutPreferenceResult {
  preferenceId: string
  initPoint: string
}

@Injectable()
export class MercadoPagoGatewayService {
  private readonly logger = new Logger(MercadoPagoGatewayService.name)

  constructor(private readonly config: ConfigService) {}

  async createCheckoutPreference(dto: CreatePreferenceDto): Promise<CheckoutPreferenceResult> {
    const accessToken = this.config.get<string>('MERCADO_PAGO_ACCESS_TOKEN')

    if (!accessToken) {
      throw new Error('MERCADO_PAGO_ACCESS_TOKEN não configurado. Não é possível criar o Checkout Pro.')
    }

    const client = new MercadoPagoConfig({ accessToken })
    const preferenceClient = new Preference(client)

    const webAppUrl = this.config.get<string>('WEB_APP_URL') ?? 'http://localhost:3000'
    const apiUrl = this.config.get<string>('API_PUBLIC_URL')


    const response = await preferenceClient.create({
      body: {
        items: [
          {
            id: dto.orderId,
            title: dto.title ?? `Pedido ${dto.orderId} - MyPass360`,
            quantity: 1,
            unit_price: dto.amount,
            currency_id: 'BRL',
          },
        ],
        payer: {
          email: dto.payerEmail,
        },
        external_reference: dto.orderId,
        // Garantir que PIX (bank_transfer) esteja disponível — não excluir
        // O MP SDK v2 usa excluded_payment_types para remover métodos
        payment_methods: {
          excluded_payment_types: [
            { id: 'ticket' }, // boleto — não relevante para ingressos
          ],
          installments: 12,
        },
        // SEMPRE enviar back_urls e auto_return — o MP exige isso para exibir PIX no Checkout Pro.
        // Em localhost o redirect não funciona (MP não alcança localhost), mas o polling
        // do frontend detecta o pagamento automaticamente. Em produção o redirect funciona normalmente.
        back_urls: {
          success: `${webAppUrl}/checkout/pagamento?orderId=${dto.orderId}`,
          pending: `${webAppUrl}/checkout/pagamento?orderId=${dto.orderId}`,
          failure: `${webAppUrl}/checkout/pagamento?orderId=${dto.orderId}`,
        },
        auto_return: 'approved',
        ...(apiUrl
          ? { notification_url: `${apiUrl}/api/v1/payments/webhook/mercadopago` }
          : {}),
      },
    })



    if (!response.id || !response.init_point) {
      throw new Error('Mercado Pago não retornou os dados esperados da preferência.')
    }

    return {
      preferenceId: response.id,
      initPoint: response.init_point,
    }
  }

  async createPixPayment(dto: CreatePaymentDto): Promise<PaymentInitializationData> {
    const accessToken = this.config.get<string>('MERCADO_PAGO_ACCESS_TOKEN')

    if (!accessToken) {
      this.logger.warn('MERCADO_PAGO_ACCESS_TOKEN não configurado. Usando PIX mockado.')
      return this.createMockPixPayment(dto)
    }

    try {
      const client = new MercadoPagoConfig({ accessToken })
      const paymentClient = new MercadoPagoPayment(client)

      const documentDigits = dto.payerDocument.replace(/\D/g, '')
      const documentType = documentDigits.length > 11 ? 'CNPJ' : 'CPF'

      const response = await paymentClient.create({
        body: {
          transaction_amount: dto.amount,
          description: `Pedido ${dto.orderId} - MyPass360`,
          payment_method_id: 'pix',
          payer: {
            email: dto.payerEmail,
            identification: {
              type: documentType,
              number: documentDigits,
            },
          },
        },
        requestOptions: {
          idempotencyKey: dto.externalId ?? randomUUID(),
        },
      })

      const pixCode = response.point_of_interaction?.transaction_data?.qr_code ?? null
      const pixExpiresAt = response.date_of_expiration ?? null

      if (!pixCode) {
        this.logger.warn(
          `Mercado Pago retornou pagamento ${response.id} sem código PIX. Resposta: ${JSON.stringify(response.point_of_interaction)}`
        )
      }

      return {
        externalId: response.id?.toString() ?? dto.externalId ?? `mp_${randomUUID()}`,
        pixCode,
        pixExpiresAt,
      }
    } catch (error) {
      this.logger.error(
        `Falha ao criar pagamento PIX no Mercado Pago. Usando fallback mockado. Motivo: ${
          error instanceof Error ? error.message : JSON.stringify(error)
        }`
      )
      return this.createMockPixPayment(dto)
    }
  }

  async fetchPaymentStatus(externalId: string): Promise<string | null> {
    const accessToken = this.config.get<string>('MERCADO_PAGO_ACCESS_TOKEN')

    if (!accessToken) {
      return null
    }

    const response = await fetch(`https://api.mercadopago.com/v1/payments/${externalId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as { status?: string }
    return payload.status ?? null
  }

  /**
   * Busca o status do pagamento no MP pela external_reference (nosso orderId).
   * Necessário para Checkout Pro onde o external_id armazenado é o preferenceId,
   * não o paymentId do MP.
   */
  async fetchPaymentStatusByOrderId(orderId: string): Promise<string | null> {
    const accessToken = this.config.get<string>('MERCADO_PAGO_ACCESS_TOKEN')

    if (!accessToken) {
      return null
    }

    try {
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/search?external_reference=${orderId}&sort=date_created&criteria=desc`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      if (!response.ok) {
        this.logger.warn(`MP search falhou para orderId=${orderId}: ${response.status}`)
        return null
      }

      const payload = (await response.json()) as {
        results?: Array<{ status?: string; id?: number }>
      }

      const latest = payload.results?.[0]
      if (!latest) return null

      this.logger.debug(`MP search para orderId=${orderId}: payment_id=${latest.id}, status=${latest.status}`)
      return latest.status ?? null
    } catch (err) {
      this.logger.warn(`Erro ao buscar MP por external_reference: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }

  private createMockPixPayment(dto: CreatePaymentDto): PaymentInitializationData {
    const externalId = dto.externalId ?? `pix_${randomUUID()}`
    const pixCode = `00020126580014BR.GOV.BCB.PIX0136${externalId}520400005303986540${dto.amount.toFixed(2)}5802BR5925MYPASS3606009SAO PAULO62070503***6304ABCD`
    const pixExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    return {
      externalId,
      pixCode,
      pixExpiresAt,
    }
  }
}

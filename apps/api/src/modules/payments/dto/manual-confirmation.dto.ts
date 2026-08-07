import { IsString, IsUUID, IsNotEmpty } from 'class-validator'

/**
 * DTO para confirmação manual de pagamento em ambiente de desenvolvimento.
 *
 * TODO: Remover este arquivo quando a integração oficial do Mercado Pago estiver concluída.
 * Consultar também: payments.controller.ts e payments.service.ts (método manualConfirmation)
 */
export class ManualConfirmationDto {
  @IsUUID()
  orderId!: string

  @IsString()
  @IsNotEmpty()
  code!: string
}

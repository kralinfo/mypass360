import { IsEmail, IsIn, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator'

export class CreatePaymentDto {
  @IsUUID()
  orderId!: string

  @IsString()
  @IsIn(['pix', 'credit_card', 'boleto'])
  provider!: 'pix' | 'credit_card' | 'boleto'

  @IsNumber()
  @Min(0)
  amount!: number

  @IsEmail()
  payerEmail!: string

  @IsString()
  payerDocument!: string

  @IsString()
  @IsOptional()
  externalId?: string
}

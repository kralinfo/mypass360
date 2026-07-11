import { IsEmail, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator'

export class CreatePreferenceDto {
  @IsUUID()
  orderId!: string

  @IsNumber()
  @Min(0)
  amount!: number

  @IsEmail()
  payerEmail!: string

  @IsString()
  @IsOptional()
  title?: string
}

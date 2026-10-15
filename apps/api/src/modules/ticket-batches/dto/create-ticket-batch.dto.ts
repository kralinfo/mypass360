import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class CreateTicketBatchDto {
  @IsString()
  name!: string

  @IsNumber()
  @Min(0)
  price!: number

  @IsInt()
  @Min(0)
  quantity!: number

  @IsBoolean()
  @IsOptional()
  is_unlimited?: boolean

  @IsInt()
  @Min(0)
  @IsOptional()
  display_order?: number
}

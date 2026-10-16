import { IsBoolean, IsInt, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class UpdateTicketBatchDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number

  @IsInt()
  @Min(0)
  @IsOptional()
  quantity?: number

  @IsBoolean()
  @IsOptional()
  is_unlimited?: boolean

  @IsIn(['future', 'open', 'sold_out', 'closed'])
  @IsOptional()
  status?: string
}

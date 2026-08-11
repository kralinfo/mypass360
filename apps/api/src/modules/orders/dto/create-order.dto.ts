import { Type } from 'class-transformer'
import { IsArray, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator'

export class CreateOrderItemDto {
  @IsUUID()
  ticketTypeId!: string

  @IsNumber()
  @Min(1)
  quantity!: number

  @IsNumber()
  @Min(0)
  unitPrice!: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nomineeNames?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  nomineeCpfs?: string[]
}

export class CreateOrderDto {
  @IsUUID()
  eventId!: string

  @IsUUID()
  userId!: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[]
}

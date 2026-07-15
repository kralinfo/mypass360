import { Type } from 'class-transformer'
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator'

export class CreateEventTicketTypeDto {
  @IsString()
  name!: string

  @IsNumber()
  @Min(0)
  price!: number

  @IsNumber()
  @Min(0)
  quantity!: number

  @IsString()
  @IsOptional()
  description?: string

  @IsNumber()
  @Min(0)
  @IsOptional()
  sold?: number
}

export class CreateEventDto {
  @IsString()
  title!: string

  @IsString()
  slug!: string

  @IsString()
  description!: string

  @IsDateString()
  date!: string

  @IsString()
  location!: string

  @IsString()
  organizer_id!: string

  @IsNumber()
  @Min(1)
  capacity!: number

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number

  @IsString()
  @IsOptional()
  @IsIn(['draft', 'published', 'cancelled', 'finished'])
  status?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEventTicketTypeDto)
  @IsOptional()
  ticket_types?: CreateEventTicketTypeDto[]
}

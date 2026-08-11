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

  @IsNumber()
  @Min(1)
  capacity!: number

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number

  // status é gerenciado pelo backend — não aceitar do frontend para novos eventos
  // (mantido aqui apenas para compatibilidade com UpdateEventDto via PartialType)
  @IsString()
  @IsOptional()
  status?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEventTicketTypeDto)
  @IsOptional()
  ticket_types?: CreateEventTicketTypeDto[]

  @IsOptional()
  @IsIn(['ticket', 'formal_pdf'])
  ticket_layout?: string

  @IsOptional()
  @IsIn(['none', 'name', 'name_cpf'])
  participant_id_type?: string
}

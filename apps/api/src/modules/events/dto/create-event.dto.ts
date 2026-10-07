import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
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

  @IsBoolean()
  @IsOptional()
  is_unlimited?: boolean

  @ValidateIf((_, v) => v != null)
  @IsString()
  @IsOptional()
  description?: string | null

  @ValidateIf((_, v) => v != null)
  @IsNumber()
  @Min(0)
  @IsOptional()
  sold?: number | null
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

  @ValidateIf((_, v) => v != null)
  @IsString()
  @IsOptional()
  city?: string | null

  @ValidateIf((_, v) => v != null)
  @IsString()
  @IsOptional()
  state?: string | null

  @ValidateIf((_, v) => v != null)
  @IsNumber()
  @IsOptional()
  latitude?: number | null

  @ValidateIf((_, v) => v != null)
  @IsNumber()
  @IsOptional()
  longitude?: number | null

  @ValidateIf((_, v) => v != null)
  @IsString()
  @IsOptional()
  place_id?: string | null

  @IsNumber()
  @Min(0)
  capacity!: number

  @IsBoolean()
  @IsOptional()
  is_capacity_unlimited?: boolean

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

  @ValidateIf((_, v) => v != null)
  @IsString()
  @IsOptional()
  image_url?: string | null

  @ValidateIf((_, v) => v != null)
  @IsString()
  @IsOptional()
  genre?: string | null

  @IsOptional()
  @IsIn(['PAID', 'FREE'])
  event_type?: string

  @IsOptional()
  @IsIn(['PUBLIC', 'PRIVATE'])
  visibility?: string

  @ValidateIf((_, v) => v != null)
  @IsString()
  @IsOptional()
  access_password?: string | null
}

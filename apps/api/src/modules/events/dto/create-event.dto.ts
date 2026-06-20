import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator'

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
  organizerId!: string

  @IsNumber()
  @Min(1)
  capacity!: number

  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number
}

import { PartialType } from '@nestjs/mapped-types'
import { IsNumber, IsOptional, Min } from 'class-validator'
import { CreateEventDto } from './create-event.dto'

export class UpdateEventDto extends PartialType(CreateEventDto) {
  // Sobrescreve a restrição @Min(1) da criação — em updates, capacity vem do cálculo dos ticket_types
  @IsNumber()
  @IsOptional()
  @Min(0)
  override capacity?: number
}

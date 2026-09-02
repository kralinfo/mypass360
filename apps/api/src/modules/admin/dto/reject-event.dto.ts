import { IsOptional, IsString } from 'class-validator'

export class RejectEventDto {
  /** Justificativa da rejeição. Campo preparado para uso futuro — opcional por enquanto. */
  @IsString()
  @IsOptional()
  reason?: string
}

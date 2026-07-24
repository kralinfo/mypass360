import { IsDateString } from 'class-validator'

export class ScheduleEventDto {
  /**
   * Data e hora de publicação no formato ISO 8601.
   * Deve ser uma data futura.
   * Exemplo: "2026-09-20T18:00:00.000Z"
   */
  @IsDateString()
  published_at!: string
}

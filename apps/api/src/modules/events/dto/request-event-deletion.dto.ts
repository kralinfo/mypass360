import { IsNotEmpty, IsString, MinLength } from 'class-validator'

export class RequestEventDeletionDto {
  /** Motivo da solicitação de exclusão (obrigatório). */
  @IsString()
  @IsNotEmpty({ message: 'O motivo da exclusão é obrigatório.' })
  @MinLength(5, { message: 'Por favor, informe um motivo mais detalhado (mínimo 5 caracteres).' })
  reason!: string
}

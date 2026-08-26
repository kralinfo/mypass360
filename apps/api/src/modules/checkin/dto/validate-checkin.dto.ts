import { IsNotEmpty, IsString } from 'class-validator'

export class ValidateCheckinDto {
  @IsString()
  @IsNotEmpty({ message: 'O identificador do ingresso é obrigatório' })
  ticketId!: string

  @IsString()
  @IsNotEmpty({ message: 'A credencial de acesso é obrigatória' })
  accessCode!: string
}

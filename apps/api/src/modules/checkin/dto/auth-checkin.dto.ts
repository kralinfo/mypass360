import { IsNotEmpty, IsString } from 'class-validator'

export class AuthCheckinDto {
  @IsString()
  @IsNotEmpty({ message: 'O código de acesso é obrigatório' })
  code!: string
}

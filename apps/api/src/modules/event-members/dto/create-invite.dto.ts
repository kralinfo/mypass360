import { IsEmail, IsNotEmpty } from 'class-validator'

export class CreateInviteDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  email!: string
}

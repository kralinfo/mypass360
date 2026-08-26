import { IsNotEmpty, IsString } from 'class-validator'

export class CreateCheckinAccessDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome do acesso é obrigatório' })
  name!: string
}

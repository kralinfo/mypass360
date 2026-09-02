import { IsNotEmpty, IsString, MinLength } from 'class-validator'

export class ReplyAdminMessageDto {
  /** Resposta de retorno do organizador para a administração (obrigatório). */
  @IsString()
  @IsNotEmpty({ message: 'A resposta é obrigatória.' })
  @MinLength(2, { message: 'A resposta deve conter pelo menos 2 caracteres.' })
  replyMessage!: string
}

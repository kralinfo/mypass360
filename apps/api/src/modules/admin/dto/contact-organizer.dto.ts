import { IsNotEmpty, IsString, MinLength } from 'class-validator'

export class ContactOrganizerDto {
  /** Mensagem personalizada enviada do administrador para o organizador (obrigatório). */
  @IsString()
  @IsNotEmpty({ message: 'A mensagem para o organizador é obrigatória.' })
  @MinLength(5, { message: 'A mensagem deve ter pelo menos 5 caracteres.' })
  message!: string
}

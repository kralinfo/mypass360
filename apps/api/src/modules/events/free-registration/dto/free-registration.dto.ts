import { IsOptional, IsString } from 'class-validator'

export class FreeRegistrationDto {
  @IsString()
  @IsOptional()
  participant_name?: string

  @IsString()
  @IsOptional()
  participant_cpf?: string

  @IsString()
  @IsOptional()
  registration_token?: string
}

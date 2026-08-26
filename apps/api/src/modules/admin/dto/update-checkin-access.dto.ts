import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class UpdateCheckinAccessDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}

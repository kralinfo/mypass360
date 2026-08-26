import { IsBoolean } from 'class-validator'

export class UpdateEventCheckinStatusDto {
  @IsBoolean()
  enabled!: boolean
}

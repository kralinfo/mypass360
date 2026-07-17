import { IsIn, IsString } from 'class-validator'

export class UpdateAdminEventStatusDto {
  @IsString()
  @IsIn(['draft', 'published', 'cancelled', 'finished'])
  status!: 'draft' | 'published' | 'cancelled' | 'finished'
}
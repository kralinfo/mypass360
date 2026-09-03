import { IsObject, IsOptional, IsString } from 'class-validator'

export class CreateNotificationBackendDto {
  @IsString()
  userId!: string

  @IsString()
  type!: string

  @IsString()
  title!: string

  @IsString()
  message!: string

  @IsString()
  @IsOptional()
  entityType?: string

  @IsString()
  @IsOptional()
  entityId?: string

  @IsString()
  @IsOptional()
  actionUrl?: string

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>
}

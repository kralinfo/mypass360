import { Module } from '@nestjs/common'
import { SupabaseModule } from '@/common/supabase/supabase.module'
import { FreeRegistrationController } from './free-registration.controller'
import { FreeRegistrationService } from './free-registration.service'

@Module({
  imports: [SupabaseModule],
  controllers: [FreeRegistrationController],
  providers: [FreeRegistrationService],
  exports: [FreeRegistrationService],
})
export class FreeRegistrationModule {}

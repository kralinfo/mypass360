import { Module } from '@nestjs/common'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'
import { NotificationsRepository } from './notifications.repository'
import { SupabaseModule } from '@/common/supabase/supabase.module'
import { MailModule } from '@/common/mail/mail.module'
import { ConfigModule } from '@nestjs/config'

@Module({
  imports: [SupabaseModule, MailModule, ConfigModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository],
  exports: [NotificationsService, NotificationsRepository],
})
export class NotificationsModule {}

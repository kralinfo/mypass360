import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EventMembersController } from './event-members.controller'
import { EventMembersService } from './event-members.service'
import { EventMembersRepository } from './event-members.repository'
import { EventsModule } from '../events/events.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { MailModule } from '@/common/mail/mail.module'
import { SupabaseModule } from '@/common/supabase/supabase.module'

@Module({
  imports: [
    SupabaseModule,
    EventsModule,
    NotificationsModule,
    MailModule,
    ConfigModule,
  ],
  controllers: [EventMembersController],
  providers: [EventMembersService, EventMembersRepository],
  exports: [EventMembersService, EventMembersRepository],
})
export class EventMembersModule {}

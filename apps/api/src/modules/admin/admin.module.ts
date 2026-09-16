import { Module } from '@nestjs/common'
import { AdminController } from './admin.controller'
import { AdminRepository } from './admin.repository'
import { AdminService } from './admin.service'
import { EventsRepository } from '@/modules/events/events.repository'
import { MailModule } from '@/common/mail/mail.module'
import { NotificationsModule } from '@/modules/notifications/notifications.module'

@Module({
  imports: [MailModule, NotificationsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository, EventsRepository],
  exports: [AdminRepository],
})
export class AdminModule {}

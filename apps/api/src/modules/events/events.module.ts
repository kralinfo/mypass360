import { Module } from '@nestjs/common'
import { EventsController } from './events.controller'
import { EventsRepository } from './events.repository'
import { EventsService } from './events.service'
import { AdminModule } from '@/modules/admin/admin.module'
import { NotificationsModule } from '@/modules/notifications/notifications.module'

@Module({
  imports: [AdminModule, NotificationsModule],
  controllers: [EventsController],
  providers: [EventsService, EventsRepository],
})
export class EventsModule {}


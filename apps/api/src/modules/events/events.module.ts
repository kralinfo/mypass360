import { Module } from '@nestjs/common'
import { EventsController } from './events.controller'
import { EventsRepository } from './events.repository'
import { EventsService } from './events.service'
import { AdminModule } from '@/modules/admin/admin.module'

@Module({
  imports: [AdminModule],
  controllers: [EventsController],
  providers: [EventsService, EventsRepository],
})
export class EventsModule {}

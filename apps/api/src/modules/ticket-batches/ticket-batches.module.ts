import { Module } from '@nestjs/common'
import { TicketBatchesService } from './ticket-batches.service'
import { TicketBatchesController } from './ticket-batches.controller'
import { SupabaseModule } from '@/common/supabase/supabase.module'
import { EventsModule } from '@/modules/events/events.module'

@Module({
  imports: [SupabaseModule, EventsModule],
  controllers: [TicketBatchesController],
  providers: [TicketBatchesService],
  exports: [TicketBatchesService],
})
export class TicketBatchesModule {}

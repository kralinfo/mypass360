import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SupabaseModule } from './common/supabase/supabase.module'
import { AuthModule } from './modules/auth/auth.module'
import { AdminModule } from './modules/admin/admin.module'
import { EventsModule } from './modules/events/events.module'
import { OrdersModule } from './modules/orders/orders.module'
import { PaymentsModule } from './modules/payments/payments.module'
import { TicketsModule } from './modules/tickets/tickets.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    AuthModule,
    AdminModule,
    EventsModule,
    OrdersModule,
    PaymentsModule,
    TicketsModule,
  ],
})
export class AppModule {}

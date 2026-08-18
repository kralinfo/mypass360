import { Module } from '@nestjs/common'
import { AdminController } from './admin.controller'
import { AdminRepository } from './admin.repository'
import { AdminService } from './admin.service'
import { MailModule } from '@/common/mail/mail.module'

@Module({
  imports: [MailModule],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository],
})
export class AdminModule {}
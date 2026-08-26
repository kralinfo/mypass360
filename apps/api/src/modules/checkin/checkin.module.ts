import { Module } from '@nestjs/common'
import { CheckinController } from './checkin.controller'
import { CheckinService } from './checkin.service'
import { CheckinRepository } from './checkin.repository'

@Module({
  controllers: [CheckinController],
  providers: [CheckinService, CheckinRepository],
  exports: [CheckinService, CheckinRepository],
})
export class CheckinModule {}

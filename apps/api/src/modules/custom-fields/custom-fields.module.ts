import { Global, Module } from '@nestjs/common'
import { CustomFieldsService } from './custom-fields.service'

@Global()
@Module({
  providers: [CustomFieldsService],
  exports: [CustomFieldsService],
})
export class CustomFieldsModule {}

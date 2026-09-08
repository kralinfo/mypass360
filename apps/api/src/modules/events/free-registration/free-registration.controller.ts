import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common'
import { AuthGuard, type AuthenticatedUser } from '@/common/guards/auth.guard'
import { CurrentUser } from '@/common/decorators/current-user.decorator'
import { FreeRegistrationService } from './free-registration.service'
import { ValidatePasswordDto } from './dto/validate-password.dto'
import { FreeRegistrationDto } from './dto/free-registration.dto'

@Controller('events')
export class FreeRegistrationController {
  constructor(private readonly freeRegistrationService: FreeRegistrationService) {}

  @Post(':id/free-registration/validate-password')
  @UseGuards(AuthGuard)
  validatePassword(
    @Param('id') eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ValidatePasswordDto
  ) {
    return this.freeRegistrationService.validatePassword(eventId, user.id, dto.access_password)
  }

  @Post(':id/free-registration')
  @UseGuards(AuthGuard)
  register(
    @Param('id') eventId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: FreeRegistrationDto
  ) {
    return this.freeRegistrationService.register(eventId, user, dto)
  }
}

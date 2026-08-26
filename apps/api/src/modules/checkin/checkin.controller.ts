import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common'
import { CheckinService } from './checkin.service'
import { AuthCheckinDto } from './dto/auth-checkin.dto'
import { ValidateCheckinDto } from './dto/validate-checkin.dto'

@Controller('checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  /**
   * Autentica a credencial de acesso do operador de portaria.
   * Não requer login de admin ou usuário normal.
   */
  @Post('auth')
  @HttpCode(200)
  authenticate(@Body() dto: AuthCheckinDto) {
    return this.checkinService.authenticateAccess(dto.code)
  }

  /**
   * Valida o QR Code lido e registra o Check-in no evento.
   */
  @Post('validate')
  @HttpCode(200)
  validateTicket(@Body() dto: ValidateCheckinDto) {
    return this.checkinService.validateTicket(dto)
  }

  /**
   * Retorna os últimos check-ins realizados para exibição na tela do operador.
   */
  @Get('recent')
  getRecentCheckins(@Query('accessCode') accessCode: string) {
    return this.checkinService.getRecentCheckins(accessCode)
  }
}

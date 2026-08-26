import { Injectable, UnauthorizedException } from '@nestjs/common'
import { CheckinRepository } from './checkin.repository'
import type { ValidateCheckinDto } from './dto/validate-checkin.dto'
import type { CheckinAuthResponse, CheckinRecord, CheckinValidationResult } from '@mypass360/types'

@Injectable()
export class CheckinService {
  constructor(private readonly checkinRepository: CheckinRepository) {}

  /**
   * Autentica o operador pelo código de acesso e retorna o contexto do evento.
   */
  async authenticateAccess(code: string): Promise<CheckinAuthResponse> {
    const authData = await this.checkinRepository.findAccessByCode(code)
    if (!authData) {
      throw new UnauthorizedException('Código de acesso de check-in inválido ou inativo.')
    }
    return authData
  }

  /**
   * Valida o QR Code / UUID do ingresso e registra a entrada.
   */
  async validateTicket(dto: ValidateCheckinDto): Promise<CheckinValidationResult> {
    return this.checkinRepository.validateTicket(dto.ticketId, dto.accessCode)
  }

  /**
   * Lista os check-ins recentes do evento para o painel do operador.
   */
  async getRecentCheckins(accessCode: string): Promise<CheckinRecord[]> {
    return this.checkinRepository.getRecentCheckins(accessCode)
  }
}

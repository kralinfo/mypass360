import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import { randomUUID } from 'crypto'
import * as QRCode from 'qrcode'
import { SupabaseService } from '@/common/supabase/supabase.service'
import type { AuthenticatedUser } from '@/common/guards/auth.guard'
import type { FreeRegistrationDto } from './dto/free-registration.dto'

const TOKEN_SECRET = process.env.JWT_SECRET || 'mypass360_free_rsvp_token_secret_2026'
const TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutos

@Injectable()
export class FreeRegistrationService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Valida a senha de acesso de um evento gratuito e gera um registration_token temporário.
   */
  async validatePassword(eventId: string, userId: string, accessPassword: string) {
    const { data: event, error } = await this.supabase
      .getClient()
      .from('events')
      .select('access_password_hash, event_type, status')
      .eq('id', eventId)
      .single()

    if (error || !event) {
      throw new NotFoundException('Evento não encontrado')
    }

    if (event.event_type !== 'FREE') {
      throw new BadRequestException('Este evento não é um evento gratuito com confirmação de presença.')
    }

    if (!event.access_password_hash) {
      return { valid: true }
    }

    const isMatch = bcrypt.compareSync(accessPassword.trim(), event.access_password_hash)
    if (!isMatch) {
      return { valid: false, message: 'Senha de acesso incorreta. Tente novamente.' }
    }

    const registrationToken = this.generateToken(eventId, userId)
    return {
      valid: true,
      registration_token: registrationToken,
    }
  }

  /**
   * Realiza a confirmação de presença (inscrição gratuita) de um usuário em um evento.
   */
  async register(eventId: string, user: AuthenticatedUser, dto: FreeRegistrationDto) {
    // 1. Buscar evento
    const { data: event, error: eventError } = await this.supabase
      .getClient()
      .from('events')
      .select('id, title, status, event_type, capacity, access_password_hash')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      throw new NotFoundException('Evento não encontrado.')
    }

    if (event.status !== 'published') {
      throw new BadRequestException('Este evento não está aberto para confirmação de presença.')
    }

    if (event.event_type !== 'FREE') {
      throw new BadRequestException('Este evento não é um evento gratuito.')
    }

    // 2. Validação de senha de acesso (se configurada no evento)
    if (event.access_password_hash) {
      if (!dto.registration_token) {
        throw new ForbiddenException('Este evento exige senha de acesso para confirmar presença.')
      }

      const isValidToken = this.verifyToken(dto.registration_token, eventId, user.id)
      if (!isValidToken) {
        throw new ForbiddenException('Sessão de validação expirada ou inválida. Digite a senha novamente.')
      }
    }

    // 3. Verificar se o usuário já possui inscrição ativa neste evento
    const { data: existingTickets, error: existingError } = await this.supabase
      .getClient()
      .from('tickets')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .neq('status', 'CANCELED')

    if (existingError) {
      throw new BadRequestException('Erro ao verificar inscrições prévias.')
    }

    if (existingTickets && existingTickets.length > 0) {
      throw new BadRequestException('Você já possui uma presença confirmada para este evento.')
    }

    // 4. Verificar capacidade disponível
    const { count, error: countError } = await this.supabase
      .getClient()
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .neq('status', 'CANCELED')

    if (countError) {
      throw new BadRequestException('Erro ao consultar vagas disponíveis.')
    }

    const currentRegistrations = count ?? 0
    if (currentRegistrations >= event.capacity) {
      throw new BadRequestException('As vagas para este evento gratuito estão esgotadas.')
    }

    // 5. Gerar ingresso / comprovante de presença gratuito
    const ticketId = randomUUID()
    const publicCode = 'FR-' + randomUUID().substring(0, 6).toUpperCase()

    const qrCodeDataUrl = await QRCode.toDataURL(ticketId, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
    })

    const buyerName =
      dto.participant_name?.trim() ||
      (user.user_metadata?.name as string) ||
      user.email

    const buyerCpf = dto.participant_cpf?.trim() || (user.user_metadata?.cpf as string) || null

    const ticketRecord = {
      id: ticketId,
      public_code: publicCode,
      order_id: null,
      order_item_id: null,
      ticket_type_id: null,
      user_id: user.id,
      buyer_name: buyerName,
      buyer_email: user.email,
      buyer_cpf: buyerCpf,
      event_id: eventId,
      qr_code: qrCodeDataUrl,
      status: 'VALID',
      registration_type: 'FREE',
      issued_at: new Date().toISOString(),
    }

    const { data: ticket, error: insertError } = await this.supabase
      .getClient()
      .from('tickets')
      .insert(ticketRecord)
      .select('*, event:events(id, title, date, location, slug, ticket_layout, participant_id_type)')
      .single()

    if (insertError) {
      throw new BadRequestException(`Erro ao registrar presença: ${insertError.message}`)
    }

    return ticket
  }

  /**
   * Gera um token HMAC assinado para confirmação de presença após digitar a senha.
   */
  private generateToken(eventId: string, userId: string): string {
    const timestamp = Date.now().toString()
    const payload = `${eventId}:${userId}:${timestamp}`
    const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex')
    return `${payload}:${signature}`
  }

  /**
   * Valida a assinatura HMAC e expiração do token de registro.
   */
  private verifyToken(token: string, expectedEventId: string, expectedUserId: string): boolean {
    try {
      const parts = token.split(':')
      if (parts.length !== 4) return false

      const [eventId, userId, timestampStr, signature] = parts
      if (eventId !== expectedEventId || userId !== expectedUserId) return false

      const timestamp = parseInt(timestampStr, 10)
      if (isNaN(timestamp) || Date.now() - timestamp > TOKEN_TTL_MS) return false

      const payload = `${eventId}:${userId}:${timestampStr}`
      const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex')

      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    } catch {
      return false
    }
  }
}

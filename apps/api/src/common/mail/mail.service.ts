import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import nodemailer from 'nodemailer'

type MailAttachment = {
  filename: string
  content: Buffer
  cid?: string
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly transporter: nodemailer.Transporter | null
  private readonly fromAddress: string | null

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('EMAIL_HOST')
    const port = Number(this.config.get<string>('EMAIL_PORT') ?? '587')
    const secure = this.config.get<string>('EMAIL_SECURE') === 'true'
    const user = this.config.get<string>('EMAIL_USER')
    const pass = this.config.get<string>('EMAIL_PASSWORD')
    const from = this.config.get<string>('EMAIL_FROM')

    if (!host || !port || !user || !pass || !from) {
      // Não derruba a aplicação — apenas desativa o envio de email até ser configurado.
      this.logger.warn('Variáveis de email não configuradas — envio de email desativado.')
      this.fromAddress = null
      this.transporter = null
      return
    }

    this.fromAddress = from
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    })
  }

  async sendTicketEmail(params: {
    to: string
    subject: string
    html: string
    attachments?: MailAttachment[]
  }) {
    if (!this.transporter || !this.fromAddress) {
      this.logger.warn(`Email para ${params.to} não enviado — serviço de email não configurado.`)
      return null
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: params.to,
        subject: params.subject,
        html: params.html,
        attachments: params.attachments,
      })

      this.logger.log(`Email enviado para ${params.to} - messageId=${info.messageId}`)
      return info
    } catch (error) {
      this.logger.error(`Falha ao enviar email para ${params.to}: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    }
  }
}

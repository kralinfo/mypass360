import { Injectable } from '@nestjs/common'
import { MailService } from '@/common/mail/mail.service'
import { TicketsService } from '../tickets/tickets.service'
import { SupabaseService } from '@/common/supabase/supabase.service'
import PDFDocument from 'pdfkit'
import * as QRCode from 'qrcode'

@Injectable()
export class PaymentMailService {
  constructor(
    private readonly mailService: MailService,
    private readonly ticketsService: TicketsService,
    private readonly supabase: SupabaseService
  ) {}

  async sendOrderTicketsEmail(orderId: string) {
    const { data: order, error: orderError } = await this.supabase
      .getClient()
      .from('orders')
      .select('*, event_id, user_id')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error(`Pedido '${orderId}' não encontrado para envio de email.`)
    }

    const { data: userData } = await this.supabase
      .getClient()
      .auth.admin.getUserById(order.user_id)

    const userEmail = userData?.user?.email
    if (!userEmail) {
      throw new Error(`Email do comprador não encontrado para pedido '${orderId}'.`)
    }

    const eventId = order.event_id
    const { data: event } = await this.supabase
      .getClient()
      .from('events')
      .select('title, ticket_layout, participant_id_type, date, location')
      .eq('id', eventId)
      .single()

    const tickets = await this.ticketsService.findByOrder(orderId)
    const pdfBuffer = await this.buildTicketsPdf(event, tickets)

    const html = this.buildEmailHtml(event?.title ?? 'Seu evento', tickets)
    await this.mailService.sendTicketEmail({
      to: userEmail,
      subject: `Seu ingresso para ${event?.title ?? 'o evento'}`,
      html,
      attachments: [
        {
          filename: this.buildPdfFileName(event?.title ?? 'ingressos'),
          content: pdfBuffer,
        },
      ],
    })
  }

  private buildEmailHtml(eventTitle: string, tickets: any[]) {
    const ticketRows = tickets
      .map(
        (ticket) => `
          <tr>
            <td style="padding: 14px 12px; border-bottom: 1px solid #e2e8f0;">${ticket.ticketType?.name ?? 'Ingresso'}</td>
            <td style="padding: 14px 12px; border-bottom: 1px solid #e2e8f0;">${ticket.public_code ?? ticket.id.slice(0, 8).toUpperCase()}</td>
            <td style="padding: 14px 12px; border-bottom: 1px solid #e2e8f0;">${ticket.buyer_name ?? ticket.buyer_email ?? '—'}</td>
            <td style="padding: 14px 12px; border-bottom: 1px solid #e2e8f0;">${ticket.event?.ticket_layout === 'formal_pdf' ? 'PDF Formal' : 'Ticket Digital'}</td>
          </tr>
        `
      )
      .join('')

    return `
      <div style="font-family: Inter, system-ui, sans-serif; background: #f8fafc; padding: 32px;">
        <div style="max-width: 720px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 30px 80px rgba(15, 23, 42, 0.1);">
          <div style="background: linear-gradient(135deg, #6d28d9 0%, #2563eb 100%); padding: 40px 32px; color: #ffffff; text-align: center;">
            <p style="margin: 0; opacity: 0.9; letter-spacing: 0.12em; font-size: 0.9rem; text-transform: uppercase;">MyPass360</p>
            <h1 style="margin: 12px 0 0; font-size: 2.25rem; line-height: 1.1;">Ingresso pronto</h1>
          </div>

          <div style="padding: 32px; color: #0f172a;">
            <p style="margin: 0 0 20px; font-size: 1rem; color: #475569;">Olá,</p>
            <p style="margin: 0 0 16px; font-size: 1rem;">Seu pagamento foi confirmado e o ingresso para <strong>${eventTitle}</strong> foi gerado com sucesso.</p>
            <p style="margin: 0 0 24px; font-size: 1rem; color: #475569;">O arquivo PDF já está anexado. Abra-o no celular ou imprima-o para apresentar na entrada do evento.</p>
            <a href="https://seu-app.com/meus-ingressos" style="display: inline-flex; align-items: center; justify-content: center; padding: 14px 24px; border-radius: 999px; background: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 700;">Ver meus ingressos</a>

            <h2 style="margin: 36px 0 16px; font-size: 1.1rem; color: #0f172a;">Resumo do ingresso</h2>
            <div style="overflow-x:auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.96rem; color: #334155;">
                <thead>
                  <tr style="background: #f8fafc; text-align: left;">
                    <th style="padding: 12px 12px; color: #475569;">Tipo</th>
                    <th style="padding: 12px 12px; color: #475569;">Código</th>
                    <th style="padding: 12px 12px; color: #475569;">Portador</th>
                    <th style="padding: 12px 12px; color: #475569;">Formato</th>
                  </tr>
                </thead>
                <tbody>
                  ${ticketRows}
                </tbody>
              </table>
            </div>

            <p style="margin: 28px 0 0; color: #6b7280; font-size: 0.95rem;">Se quiser, você também pode baixar o PDF e apresentar o QR Code na entrada do evento.</p>
            <p style="margin: 12px 0 0; color: #94a3b8; font-size: 0.85rem;">MyPass360 — seu evento, seu ingresso.</p>
          </div>
        </div>
      </div>
    `
  }

  private buildPdfFileName(eventTitle: string) {
    const safeTitle = eventTitle
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 36)
      .replace(/-+$/g, '')

    return `${safeTitle || 'ingressos'}.pdf`
  }

  private async buildTicketsPdf(event: any, tickets: any[]) {
    const layout = event?.ticket_layout ?? 'ticket'
    if (layout === 'formal_pdf') {
      return this.buildFormalPdf(event, tickets)
    }
    return this.buildTicketStylePdf(event, tickets)
  }

  private async buildTicketStylePdf(event: any, tickets: any[]) {
    // Espelha exatamente o design de apps/web/src/features/tickets/components/TicketPdfGenerator.tsx
    const mm = (v: number) => v * 2.83464567
    const ticketWidth = mm(200)
    const ticketHeight = mm(75)
    const stubWidth = mm(50)
    const mainWidth = ticketWidth - stubWidth

    const doc = new PDFDocument({ size: [ticketWidth, ticketHeight], margin: 0 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))
    const complete = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
    })

    const eventDate = event?.date
      ? new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—'
    const eventTime = event?.date
      ? new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '—'
    const eventLocation = event?.location ?? '—'
    const isAnonymous = event?.participant_id_type === 'none'
    const hasParticipantName = event?.participant_id_type !== 'none'

    for (let index = 0; index < tickets.length; index += 1) {
      const ticket = tickets[index]
      const type = ticket.ticketType?.name ?? 'Ingresso'
      const buyerName = isAnonymous ? '' : (ticket.buyer_name ?? ticket.buyer_email ?? '—')
      const publicCode = ticket.public_code ?? ticket.id.slice(0, 8).toUpperCase()
      const qrBuffer = await QRCode.toBuffer(ticket.id, { errorCorrectionLevel: 'H', type: 'png', width: 200 })

      if (index > 0) {
        doc.addPage({ size: [ticketWidth, ticketHeight], margin: 0 })
      }

      const radius = mm(4)
      doc.save()
      doc.roundedRect(0, 0, ticketWidth, ticketHeight, radius).clip()

      // Gradiente diagonal principal: indigo -> violeta -> azul (igual ao preview do sistema)
      const mainGradient = doc.linearGradient(0, 0, mainWidth, ticketHeight)
      mainGradient.stop(0, '#6366f1').stop(0.4, '#4f46e5').stop(1, '#2563eb')
      doc.rect(0, 0, mainWidth, ticketHeight).fill(mainGradient)

      // Stub direito com gradiente navy (igual ao canhoto do preview)
      const stubGradient = doc.linearGradient(mainWidth, 0, ticketWidth, ticketHeight)
      stubGradient.stop(0, '#1e1b4b').stop(1, '#312e81')
      doc.rect(mainWidth, 0, stubWidth, ticketHeight).fill(stubGradient)

      // Círculos decorativos suaves
      doc.fillOpacity(0.06).fillColor('#ffffff')
      doc.circle(mainWidth - mm(7), -mm(14), mm(32)).fill()
      doc.fillOpacity(0.04).fillColor('#ffffff')
      doc.circle(mainWidth + mm(10), ticketHeight + mm(21), mm(40)).fill()
      doc.fillOpacity(1)

      // Separador pontilhado branco
      doc.save().lineWidth(mm(0.4)).strokeColor('#ffffff').strokeOpacity(0.3)
      let dashY = mm(4)
      while (dashY < ticketHeight - mm(4)) {
        const endY = Math.min(dashY + mm(1.5), ticketHeight - mm(4))
        doc.moveTo(mainWidth, dashY).lineTo(mainWidth, endY).stroke()
        dashY += mm(3)
      }
      doc.restore()

      // Perfurações (círculos escuros) no topo e na base do canhoto
      doc.fillColor('#0f172a').fillOpacity(0.9)
      doc.circle(mainWidth, 0, mm(2.8)).fill()
      doc.circle(mainWidth, ticketHeight, mm(2.8)).fill()
      doc.fillOpacity(1)

      // ── SEÇÃO ESQUERDA ──
      const px = mm(8)
      doc.fillColor([200, 210, 255]).font('Helvetica').fontSize(6.5).text(type.toUpperCase(), px, mm(6))

      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(14)
      const titleTop = mm(13)
      doc.text(event?.title ?? 'Evento', px, titleTop, { width: mainWidth - px * 2 - mm(10) })
      const titleHeight = doc.heightOfString(event?.title ?? 'Evento', { width: mainWidth - px * 2 - mm(10) })
      let afterTitle = titleTop + titleHeight + mm(2)

      doc.save().strokeColor('#ffffff').strokeOpacity(0.3).lineWidth(mm(0.2))
        .moveTo(px, afterTitle).lineTo(mainWidth - px, afterTitle).stroke()
      doc.restore()

      if (hasParticipantName) {
        doc.fillColor([200, 210, 255]).font('Helvetica').fontSize(6).text('PORTADOR', px, afterTitle + mm(4))
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
          .text(buyerName.toUpperCase(), px, afterTitle + mm(9), { width: mainWidth - px * 2 - mm(10) })
        afterTitle += mm(20)
      } else {
        doc.fillColor([200, 210, 255]).font('Helvetica').fontSize(6).text('PORTADOR', px, afterTitle + mm(4))
        doc.save().roundedRect(px, afterTitle + mm(9), mainWidth - px * 2 - mm(10), mm(7), mm(1.2))
          .fillColor('#ffffff').fillOpacity(0.12).fill()
        doc.restore()
        doc.fillColor('#ffffff').fillOpacity(1).font('Helvetica-Bold').fontSize(7)
          .text('INGRESSO AO PORTADOR / TRANSFERÍVEL', px + mm(2), afterTitle + mm(11))
        afterTitle += mm(20)
      }

      doc.fillColor([200, 210, 255]).font('Helvetica').fontSize(6.5).text('CÓDIGO', px, afterTitle + mm(2))
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8).text(publicCode, px + mm(14), afterTitle + mm(2))

      const footerY = ticketHeight - mm(9)
      doc.fillColor([200, 210, 255]).font('Helvetica').fontSize(6)
        .text(`DATA  ${eventDate}`, px, footerY)
        .text(`HORA  ${eventTime}`, px + mm(52), footerY)
      const locShort = eventLocation.length > 28 ? `${eventLocation.slice(0, 28)}…` : eventLocation
      doc.text(`LOCAL  ${locShort}`, px, footerY + mm(5))

      // ── SEÇÃO DIREITA (STUB) ──
      doc.fillColor([200, 210, 255]).font('Helvetica-Bold').fontSize(5.5)
        .text(event?.title ?? 'Evento', mainWidth + mm(4), mm(7), { width: stubWidth - mm(8), align: 'center' })
      doc.fillColor([200, 210, 255]).font('Helvetica-Bold').fontSize(6)
        .text(type.toUpperCase(), mainWidth + mm(4), mm(13), { width: stubWidth - mm(8), align: 'center' })

      const qrSize = mm(24)
      const qrBoxPad = mm(2)
      const qrX = mainWidth + (stubWidth - qrSize) / 2
      const qrY = (ticketHeight - qrSize) / 2 - mm(2)
      doc.roundedRect(qrX - qrBoxPad, qrY - qrBoxPad, qrSize + qrBoxPad * 2, qrSize + qrBoxPad * 2, mm(1.5)).fillColor('#ffffff').fill()
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize })

      doc.fillColor([200, 210, 255]).font('Helvetica').fontSize(5)
        .text(publicCode, mainWidth, qrY + qrSize + qrBoxPad + mm(3), { width: stubWidth, align: 'center' })
      doc.fillColor([160, 180, 255]).font('Helvetica').fontSize(5)
        .text('MyPass360', mainWidth, ticketHeight - mm(6), { width: stubWidth, align: 'center' })

      doc.restore()
    }

    doc.end()
    return complete
  }

  private async buildFormalPdf(event: any, tickets: any[]) {
    // Espelha exatamente generateFormalPdf() de apps/web/src/features/tickets/components/TicketPdfGenerator.tsx
    const mm = (v: number) => v * 2.83464567
    const pageWidth = mm(210)
    const doc = new PDFDocument({ size: 'A4', margin: 0 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))
    const complete = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
    })

    const eventDate = event?.date
      ? new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      : '—'
    const eventTime = event?.date
      ? new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : '—'
    const eventLocation = event?.location ?? '—'

    for (let index = 0; index < tickets.length; index += 1) {
      const ticket = tickets[index]
      const ticketType = ticket.ticketType?.name ?? 'Ingresso'
      const buyerName = ticket.buyer_name ?? ticket.buyer_email ?? '—'
      const buyerCpf = ticket.buyer_cpf ?? '—'
      const publicCode = ticket.public_code ?? ticket.id.slice(0, 8).toUpperCase()
      const qrBuffer = await QRCode.toBuffer(ticket.id, { errorCorrectionLevel: 'H', type: 'png', width: 250 })

      if (index > 0) {
        doc.addPage({ size: 'A4', margin: 0 })
      }

      // Header gradiente navy (#0f172a -> #1e2952)
      const hdrSteps = 30
      const hdrHeight = mm(40)
      const stepH = hdrHeight / hdrSteps
      for (let i = 0; i < hdrSteps; i += 1) {
        const t = i / hdrSteps
        const r = Math.round(15 + (30 - 15) * t)
        const g = Math.round(23 + (41 - 23) * t)
        const b = Math.round(42 + (82 - 42) * t)
        doc.fillColor([r, g, b]).rect(0, stepH * i, pageWidth, stepH + 0.5).fill()
      }

      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10).text('MyPass360', mm(15), mm(12))
      doc.fillColor([160, 190, 230]).font('Helvetica').fontSize(7).text('INGRESSO OFICIAL', mm(15), mm(18))

      doc.fillColor([160, 190, 230]).font('Helvetica').fontSize(8).text(ticketType.toUpperCase(), mm(15), mm(27))
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(16)
        .text(event?.title ?? 'Evento', mm(15), mm(35), { width: pageWidth - mm(30) })

      let y = mm(55)
      const section = (label: string) => {
        doc.fillColor('#f8fafc').rect(mm(10), y - mm(3), pageWidth - mm(20), mm(8)).fill()
        doc.fillColor([100, 116, 139]).font('Helvetica-Bold').fontSize(7).text(label, mm(14), y + mm(1))
        y += mm(10)
      }
      const row = (label: string, value: string, rightLabel?: string, rightValue?: string) => {
        doc.fillColor([100, 116, 139]).font('Helvetica').fontSize(7).text(label, mm(14), y)
        if (rightLabel) doc.text(rightLabel, pageWidth / 2, y)
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text(value, mm(14), y + mm(5))
        if (rightLabel && rightValue) doc.text(rightValue, pageWidth / 2, y + mm(5))
        y += mm(16)
      }
      const divider = () => {
        doc.save().strokeColor('#e2e8f0').lineWidth(mm(0.3))
          .moveTo(mm(10), y).lineTo(pageWidth - mm(10), y).stroke()
        doc.restore()
        y += mm(8)
      }

      section('DADOS DO PARTICIPANTE')
      row('NOME COMPLETO', buyerName)
      row('CPF', buyerCpf)
      divider()

      section('INFORMAÇÕES DO EVENTO')
      row('DATA', eventDate, 'HORÁRIO', eventTime)
      row('LOCAL', eventLocation.length > 60 ? `${eventLocation.slice(0, 60)}…` : eventLocation)
      divider()

      section('INGRESSO')
      row('TIPO DE INGRESSO', ticketType, 'CÓDIGO', publicCode)
      divider()

      const qrSize = mm(45)
      const qrX = (pageWidth - qrSize) / 2
      doc.image(qrBuffer, qrX, y, { width: qrSize, height: qrSize })
      y += qrSize + mm(4)

      doc.fillColor([100, 116, 139]).font('Helvetica').fontSize(8).text(publicCode, pageWidth / 2, y, { align: 'center' })
      y += mm(10)

      divider()
      doc.font('Helvetica').fontSize(7).fillColor([100, 116, 139])
      const instrText = 'Apresente este ingresso (impresso ou digital) na entrada do evento. O QR Code será escaneado para validação. Este ingresso é pessoal e intransferível.'
      doc.text(instrText, mm(14), y, { width: pageWidth - mm(20) })

      // Footer
      doc.fillColor('#0f172a').rect(0, mm(282), pageWidth, mm(15)).fill()
      doc.fillColor([148, 163, 184]).font('Helvetica').fontSize(7)
        .text('MyPass360 — Plataforma de Ingressos', 0, mm(290), { width: pageWidth, align: 'center' })
        .text('mypass360.com.br', 0, mm(294), { width: pageWidth, align: 'center' })
    }

    doc.end()
    return complete
  }
}


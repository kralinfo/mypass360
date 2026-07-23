'use client'

import { useState } from 'react'
import type { Ticket } from '@mypass360/types'

interface TicketPdfGeneratorProps {
  ticket: Ticket
  buyerName?: string
}

async function generatePdf(ticket: Ticket, buyerName?: string) {
  // Importação dinâmica para evitar erros de SSR
  const { jsPDF } = await import('jspdf')
  const QRCode = await import('qrcode')

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageW = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentW = pageW - margin * 2

  // ─── BACKGROUND ───────────────────────────────────────────────
  doc.setFillColor(15, 23, 42) // #0f172a
  doc.rect(0, 0, pageW, 60, 'F')

  // ─── LOGO / HEADER ─────────────────────────────────────────────
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.text('MyPass360', margin, 30)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184) // slate-400
  doc.text('Seu ingresso oficial', margin, 40)

  // ─── NOME DO EVENTO ────────────────────────────────────────────
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  const eventTitle = ticket.event?.title ?? 'Evento'
  const titleLines = doc.splitTextToSize(eventTitle, contentW) as string[]
  doc.text(titleLines, margin, 80)

  // ─── DIVISOR ───────────────────────────────────────────────────
  const dividerY = 80 + titleLines.length * 10
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.line(margin, dividerY, pageW - margin, dividerY)

  // ─── INFORMAÇÕES DO EVENTO ─────────────────────────────────────
  let infoY = dividerY + 10
  const infoLineHeight = 8

  function addInfoRow(label: string, value: string) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139) // slate-500
    doc.text(label.toUpperCase(), margin, infoY)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(value, margin, infoY + 5)
    infoY += infoLineHeight + 6
  }

  const eventDate = ticket.event?.date
    ? new Date(ticket.event.date).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—'

  const eventTime = ticket.event?.date
    ? new Date(ticket.event.date).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  addInfoRow('Comprador', buyerName ?? ticket.buyerName ?? ticket.buyerEmail ?? '—')
  addInfoRow('Tipo de ingresso', ticket.ticketType?.name ?? '—')
  addInfoRow('Data', eventDate)
  addInfoRow('Horário', eventTime)
  addInfoRow('Local', ticket.event?.location ?? '—')
  addInfoRow('Código do ingresso', ticket.publicCode)
  addInfoRow(
    'Data da compra',
    new Date(ticket.issuedAt ?? ticket.createdAt).toLocaleDateString('pt-BR')
  )

  // ─── DIVISOR ───────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, infoY + 5, pageW - margin, infoY + 5)

  // ─── QR CODE (central, grande) ─────────────────────────────────
  const qrY = infoY + 15
  const qrSize = 70

  let qrDataUrl: string

  // Verifica se o qr_code já é um data URL ou se precisamos gerar
  if (ticket.qrCode && ticket.qrCode.startsWith('data:image')) {
    qrDataUrl = ticket.qrCode
  } else {
    // Fallback: gera QR a partir do ID do ticket
    qrDataUrl = await QRCode.toDataURL(ticket.id, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
    })
  }

  const qrX = (pageW - qrSize) / 2
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

  // Código textual abaixo do QR
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(ticket.publicCode, pageW / 2, qrY + qrSize + 8, { align: 'center' })

  // ─── INSTRUÇÃO ─────────────────────────────────────────────────
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  const instruction =
    'Apresente este QR Code na entrada do evento. Guarde este ingresso com segurança.'
  const instructionLines = doc.splitTextToSize(instruction, contentW) as string[]
  doc.text(instructionLines, pageW / 2, qrY + qrSize + 18, { align: 'center' })

  // ─── ESPAÇO RESERVADO PARA FUTURAS INFORMAÇÕES ─────────────────
  const reservedY = qrY + qrSize + 35
  doc.setFillColor(248, 250, 252) // slate-50
  doc.roundedRect(margin, reservedY, contentW, 30, 3, 3, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, reservedY, contentW, 30, 3, 3, 'S')

  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text('Portão / Check-in / Observações', margin + 5, reservedY + 10)
  doc.setTextColor(203, 213, 225)
  doc.text('Reservado para informações de check-in', margin + 5, reservedY + 18)

  // ─── RODAPÉ ────────────────────────────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 15
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text('MyPass360 © ' + new Date().getFullYear() + ' — Plataforma de ingressos', pageW / 2, footerY, {
    align: 'center',
  })
  doc.text(`ID: ${ticket.id}`, pageW / 2, footerY + 5, { align: 'center' })

  return doc
}

export function TicketPdfGenerator({ ticket, buyerName }: TicketPdfGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  const publicCode = ticket.publicCode || ticket.id.slice(0, 8).toUpperCase()

  const getFileName = () => {
    const eventTitle = (ticket.event?.title ?? 'ingresso')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
    return `${eventTitle}-${publicCode}.pdf`
  }

  async function handleView() {
    setIsGenerating(true)
    setGenError(null)
    try {
      const ticketForPdf = { ...ticket, publicCode }
      const doc = await generatePdf(ticketForPdf, buyerName)
      const blob = doc.output('blob')
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Erro ao gerar PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleDownload() {
    setIsGenerating(true)
    setGenError(null)
    try {
      const ticketForPdf = { ...ticket, publicCode }
      const doc = await generatePdf(ticketForPdf, buyerName)
      doc.save(getFileName())
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Erro ao gerar PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handlePrint() {
    setIsGenerating(true)
    setGenError(null)
    try {
      const ticketForPdf = { ...ticket, publicCode }
      const doc = await generatePdf(ticketForPdf, buyerName)
      const blob = doc.output('blob')
      const url = URL.createObjectURL(blob)
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = url
      document.body.appendChild(iframe)
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print()
          setTimeout(() => {
            document.body.removeChild(iframe)
            URL.revokeObjectURL(url)
          }, 5000)
        }, 300)
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Erro ao gerar PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.5rem 0.85rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#334155',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: isGenerating ? 'not-allowed' : 'pointer',
    opacity: isGenerating ? 0.6 : 1,
    transition: 'all 0.15s ease',
    whiteSpace: 'nowrap',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={handleView} disabled={isGenerating} style={btnBase} title="Visualizar ingresso">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Visualizar
        </button>

        <button type="button" onClick={handleDownload} disabled={isGenerating} style={btnBase} title="Baixar PDF">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Baixar PDF
        </button>

        <button type="button" onClick={handlePrint} disabled={isGenerating} style={btnBase} title="Imprimir">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Imprimir
        </button>

        {isGenerating && (
          <span style={{ fontSize: '0.8rem', color: '#64748b', alignSelf: 'center' }}>
            Gerando PDF...
          </span>
        )}
      </div>

      {genError && (
        <p style={{ fontSize: '0.78rem', color: '#dc2626', margin: 0 }}>
          ⚠ {genError}
        </p>
      )}
    </div>
  )
}

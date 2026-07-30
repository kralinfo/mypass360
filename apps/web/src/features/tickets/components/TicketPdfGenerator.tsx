'use client'

import { useState } from 'react'
import type { Ticket } from '@mypass360/types'

interface TicketPdfGeneratorProps {
  ticket: Ticket
  buyerName?: string
}

// ─── Dimensões do ingresso compacto (formato horizontal, tipo ingresso real) ──
// 200mm x 75mm — proporcional a um ingresso físico real
const TICKET_W = 200
const TICKET_H = 75
const STUB_W = 50   // largura do "canhoto" (stub direito)
const MAIN_W = TICKET_W - STUB_W

async function generatePdf(ticket: Ticket, buyerName?: string) {
  const { jsPDF } = await import('jspdf')
  const QRCode = await import('qrcode')

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [TICKET_H, TICKET_W],
  })

  const H = TICKET_H

  // ── QR Code ─────────────────────────────────────────────────────────────────
  let qrDataUrl: string
  if (ticket.qrCode && ticket.qrCode.startsWith('data:image')) {
    qrDataUrl = ticket.qrCode
  } else {
    qrDataUrl = await QRCode.toDataURL(ticket.id, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 200,
    })
  }

  // ── FUNDO GRADIENTE esquerdo (gradiente simulado com rects) ──────────────────
  // jsPDF não suporta gradiente real, simulamos com faixas de cor (roxo → azul)
  const steps = 40
  for (let i = 0; i < steps; i++) {
    const t = i / steps
    const r = Math.round(99 + (37 - 99) * t)   // 6366f1 → 2563eb
    const g = Math.round(102 + (99 - 102) * t)
    const b = Math.round(241 + (235 - 241) * t)
    doc.setFillColor(r, g, b)
    doc.rect((MAIN_W / steps) * i, 0, MAIN_W / steps + 0.5, H, 'F')
  }

  // ── FUNDO STUB (azul escuro) ─────────────────────────────────────────────────
  doc.setFillColor(30, 27, 75) // #1e1b4b
  doc.rect(MAIN_W, 0, STUB_W, H, 'F')

  // ── SEPARADOR PONTILHADO ─────────────────────────────────────────────────────
  // Simulamos pontilhado manualmente com segmentos curtos
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.4)
  const dashLen = 1.5
  const gapLen = 1.5
  let dashY = 2
  while (dashY < H - 2) {
    const endY = Math.min(dashY + dashLen, H - 2)
    doc.line(MAIN_W, dashY, MAIN_W, endY)
    dashY += dashLen + gapLen
  }

  // ── SEMICÍRCULO DE CORTE (simulado com arco branco) ─────────────────────────
  doc.setFillColor(255, 255, 255)
  // círculo à esquerda (topo)
  doc.circle(MAIN_W, 0, 4, 'F')
  // círculo à esquerda (base)
  doc.circle(MAIN_W, H, 4, 'F')



  // ── SEÇÃO ESQUERDA — CONTEÚDO PRINCIPAL ─────────────────────────────────────
  const px = 8   // padding horizontal
  const eventTitle = ticket.event?.title ?? 'Evento'
  const buyer = buyerName ?? ticket.buyerName ?? ticket.buyerEmail ?? '—'
  const ticketType = ticket.ticketType?.name ?? '—'
  const publicCode = ticket.publicCode

  const eventDate = ticket.event?.date
    ? new Date(ticket.event.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—'

  const eventTime = ticket.event?.date
    ? new Date(ticket.event.date).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  const eventLocation = ticket.event?.location ?? '—'

  // Label pequeno acima do tipo
  doc.setTextColor(200, 210, 255)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.text(ticketType.toUpperCase(), px, 10)

  // Título do evento
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  const titleLines = doc.splitTextToSize(eventTitle, MAIN_W - px * 2 - 10) as string[]
  doc.text(titleLines, px, 18)

  // Divider fino
  const afterTitle = 18 + titleLines.length * 7
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.2)
  doc.setGState(doc.GState({ opacity: 0.3 }))
  doc.line(px, afterTitle + 1, MAIN_W - px, afterTitle + 1)
  doc.setGState(doc.GState({ opacity: 1 }))

  // Label NOME
  doc.setTextColor(200, 210, 255)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.text('COMPRADOR', px, afterTitle + 7)

  // Nome do comprador
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  const buyerLines = doc.splitTextToSize(buyer.toUpperCase(), MAIN_W - px * 2 - 10) as string[]
  doc.text(buyerLines, px, afterTitle + 13)

  // Código
  doc.setTextColor(200, 210, 255)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.text('CÓDIGO', px, afterTitle + 22)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(publicCode, px + 14, afterTitle + 22)

  // Rodapé esquerdo: data | hora | local
  const footerY = H - 6
  doc.setTextColor(200, 210, 255)
  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.text(`DATA  ${eventDate}`, px, footerY)
  doc.text(`HORA  ${eventTime}`, px + 52, footerY)

  const locShort = eventLocation.length > 28 ? eventLocation.slice(0, 28) + '…' : eventLocation
  doc.text(`LOCAL  ${locShort}`, px, footerY + 5)

  // ── SEÇÃO DIREITA — STUB ─────────────────────────────────────────────────────
  const stubX = MAIN_W + 3
  const qrSize = 28
  const qrX = MAIN_W + (STUB_W - qrSize) / 2
  const qrY = (H - qrSize) / 2 - 2

  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

  // Código abaixo do QR
  doc.setTextColor(200, 210, 255)
  doc.setFontSize(5)
  doc.setFont('helvetica', 'normal')
  doc.text(publicCode, MAIN_W + STUB_W / 2, qrY + qrSize + 4, { align: 'center' })

  // Tipo do ingresso no stub (vertical, rodado)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.text(ticketType.toUpperCase(), stubX + 3, qrY - 4)

  // MyPass360 no stub
  doc.setTextColor(200, 210, 255)
  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'normal')
  doc.text('MyPass360', MAIN_W + STUB_W / 2, H - 4, { align: 'center' })

  return doc
}

export function TicketPdfGenerator({ ticket, buyerName }: TicketPdfGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  // States for HTML Preview
  const [showPreview, setShowPreview] = useState(false)
  const [previewQr, setPreviewQr] = useState<string | null>(null)

  const publicCode = ticket.publicCode || ticket.id.slice(0, 8).toUpperCase()

  const eventDate = ticket.event?.date
    ? new Date(ticket.event.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—'

  const eventTime = ticket.event?.date
    ? new Date(ticket.event.date).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

  const buyer = buyerName ?? ticket.buyerName ?? ticket.buyerEmail ?? '—'
  const ticketType = ticket.ticketType?.name ?? '—'
  const eventLocation = ticket.event?.location ?? '—'

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
      let qrDataUrl = ticket.qrCode
      if (!qrDataUrl || !qrDataUrl.startsWith('data:image')) {
        const QRCode = await import('qrcode')
        qrDataUrl = await QRCode.toDataURL(ticket.id, {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 200,
        })
      }
      setPreviewQr(qrDataUrl)
      setShowPreview(true)
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Erro ao carregar ingresso')
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
            Gerando...
          </span>
        )}
      </div>

      {genError && (
        <p style={{ fontSize: '0.78rem', color: '#dc2626', margin: 0 }}>
          ⚠ {genError}
        </p>
      )}

      {/* ── MODAL DE PREVIEW ─────────────────────────────────────────────── */}
      {showPreview && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setShowPreview(false)}
        >
          {/* Cartão do ingresso */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '680px',
              display: 'flex',
              flexDirection: 'row',
              borderRadius: '16px',
              overflow: 'visible',
              boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
              fontFamily: 'Inter, Helvetica, sans-serif',
            }}
          >
            {/* ── BOTÃO FECHAR ── */}
            <button
              onClick={() => setShowPreview(false)}
              style={{
                position: 'absolute',
                top: '-48px',
                right: 0,
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
              }}
              title="Fechar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* ── LADO ESQUERDO: CONTEÚDO PRINCIPAL ── */}
            <div
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 40%, #2563eb 100%)',
                borderRadius: '16px 0 0 16px',
                padding: '1.75rem 1.5rem',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Círculo decorativo de fundo */}
              <div style={{
                position: 'absolute',
                top: '-40px', right: '-20px',
                width: '180px', height: '180px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute',
                bottom: '-60px', right: '60px',
                width: '220px', height: '220px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.04)',
                pointerEvents: 'none',
              }} />

              {/* Tipo do ingresso */}
              <p style={{ fontSize: '0.6rem', color: 'rgba(200,210,255,0.9)', letterSpacing: '0.1em', fontWeight: 700, margin: '0 0 0.3rem 0', textTransform: 'uppercase' }}>
                {ticketType}
              </p>

              {/* Nome do evento */}
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem 0', lineHeight: 1.2, maxWidth: '340px' }}>
                {ticket.event?.title ?? 'Evento'}
              </h2>

              {/* Divider */}
              <div style={{ borderTop: '1px dashed rgba(255,255,255,0.25)', marginBottom: '1rem' }} />

              {/* Nome do comprador */}
              <p style={{ fontSize: '0.6rem', color: 'rgba(200,210,255,0.8)', letterSpacing: '0.08em', fontWeight: 600, margin: '0 0 0.2rem 0' }}>COMPRADOR</p>
              <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: '0 0 1.2rem 0', letterSpacing: '0.02em' }}>
                {buyer.toUpperCase()}
              </p>

              {/* Código */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.6rem', color: 'rgba(200,210,255,0.8)', fontWeight: 600, letterSpacing: '0.08em' }}>CÓDIGO</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', fontFamily: 'monospace', letterSpacing: '0.1em' }}>{publicCode}</span>
              </div>

              {/* Rodapé */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: '0.55rem', color: 'rgba(200,210,255,0.7)', fontWeight: 600, letterSpacing: '0.08em', margin: '0 0 0.15rem 0' }}>DATA</p>
                  <p style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 700, margin: 0 }}>{eventDate}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.55rem', color: 'rgba(200,210,255,0.7)', fontWeight: 600, letterSpacing: '0.08em', margin: '0 0 0.15rem 0' }}>HORA</p>
                  <p style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 700, margin: 0 }}>{eventTime}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.55rem', color: 'rgba(200,210,255,0.7)', fontWeight: 600, letterSpacing: '0.08em', margin: '0 0 0.15rem 0' }}>LOCAL</p>
                  <p style={{ fontSize: '0.75rem', color: '#fff', fontWeight: 700, margin: 0 }}>
                    {eventLocation.length > 30 ? eventLocation.slice(0, 30) + '…' : eventLocation}
                  </p>
                </div>
              </div>
            </div>

            {/* Efeito de corte (semicírculo) */}
            <div style={{ position: 'relative', width: '0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', zIndex: 2 }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(15,23,42,0.9)', marginTop: '-8px', flexShrink: 0 }} />
              <div style={{
                flex: 1,
                borderLeft: '2px dashed rgba(255,255,255,0.3)',
                margin: '4px 0',
              }} />
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(15,23,42,0.9)', marginBottom: '-8px', flexShrink: 0 }} />
            </div>

            {/* ── CANHOTO DIREITO ── */}
            <div
              style={{
                width: '140px',
                background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 100%)',
                borderRadius: '0 16px 16px 0',
                padding: '1.25rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                flexShrink: 0,
              }}
            >
              <p style={{ fontSize: '0.55rem', color: 'rgba(200,210,255,0.7)', letterSpacing: '0.1em', fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', margin: 0 }}>
                {ticket.event?.title ?? 'Evento'}
              </p>
              <p style={{ fontSize: '0.6rem', color: 'rgba(200,210,255,0.9)', fontWeight: 700, textAlign: 'center', margin: 0 }}>
                {ticketType.toUpperCase()}
              </p>
              {previewQr && (
                <img
                  src={previewQr}
                  alt="QR Code"
                  style={{ width: '80px', height: '80px', borderRadius: '8px', background: '#fff', padding: '4px' }}
                />
              )}
              <p style={{ fontSize: '0.5rem', color: 'rgba(200,210,255,0.6)', fontFamily: 'monospace', letterSpacing: '0.05em', textAlign: 'center', margin: 0 }}>
                {publicCode}
              </p>
              <p style={{ fontSize: '0.5rem', color: 'rgba(160,180,255,0.4)', margin: 0, textAlign: 'center' }}>MyPass360</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

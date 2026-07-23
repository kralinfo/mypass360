'use client'

import type { Ticket } from '@mypass360/types'
import { TicketPdfGenerator } from './TicketPdfGenerator'

interface TicketCardProps {
  ticket: Ticket
  buyerName?: string
}

const statusConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
  VALID: { label: 'Válido', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  PENDING: { label: 'Pendente', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  CHECKED_IN: { label: 'Utilizado', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  CANCELED: { label: 'Cancelado', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
}

export function TicketCard({ ticket, buyerName }: TicketCardProps) {
  const status = statusConfig[ticket.status] ?? statusConfig['PENDING']

  const eventDate = ticket.event?.date
    ? new Date(ticket.event.date).toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null

  const eventTime = ticket.event?.date
    ? new Date(ticket.event.date).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  const issuedAt = ticket.issuedAt ?? ticket.createdAt
  const issuedDate = issuedAt
    ? new Date(issuedAt).toLocaleDateString('pt-BR')
    : null

  return (
    <article
      style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 24px rgba(15,23,42,0.06)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
    >
      {/* Cabeçalho colorido */}
      <div
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          padding: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '0.75rem',
        }}
      >
        <div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
            {ticket.ticketType?.name ?? 'Ingresso'}
          </p>
          <h2
            style={{
              color: '#fff',
              fontSize: '1.1rem',
              fontWeight: 700,
              lineHeight: 1.3,
              margin: 0,
            }}
          >
            {ticket.event?.title ?? 'Evento'}
          </h2>
        </div>

        {/* Badge de status */}
        <span
          style={{
            background: status.bg,
            color: status.color,
            border: `1px solid ${status.border}`,
            borderRadius: '999px',
            padding: '0.3rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {status.label}
        </span>
      </div>

      {/* Corpo */}
      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Infos do evento */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {eventDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{eventDate}{eventTime && ` às ${eventTime}`}</span>
            </div>
          )}

          {ticket.event?.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#475569' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              <span>{ticket.event.location}</span>
            </div>
          )}
        </div>

        {/* Divisor com estilo de ticket */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e2e8f0', flexShrink: 0 }} />
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        </div>

        {/* Código público */}
        <div
          style={{
            background: '#f8fafc',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.15rem' }}>
              CÓDIGO DO INGRESSO
            </p>
            <p style={{ fontSize: '1rem', color: '#0f172a', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
              {ticket.publicCode}
            </p>
          </div>
          {issuedDate && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.15rem' }}>
                EMITIDO EM
              </p>
              <p style={{ fontSize: '0.85rem', color: '#475569' }}>{issuedDate}</p>
            </div>
          )}
        </div>

        {/* Ações PDF */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
          <TicketPdfGenerator ticket={ticket} buyerName={buyerName} />
        </div>
      </div>
    </article>
  )
}

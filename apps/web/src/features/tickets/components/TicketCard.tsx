'use client'

import type { Ticket } from '@mypass360/types'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TicketPdfGenerator } from './TicketPdfGenerator'
import { updateTicketBuyerName } from '../services/tickets.service'

interface TicketCardProps {
  ticket: Ticket
  buyerName?: string
  onNameUpdated?: (ticketId: string, newName: string) => void
}

const statusConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
  VALID: { label: 'Válido', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  PENDING: { label: 'Pendente', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  CHECKED_IN: { label: 'Utilizado', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  CANCELED: { label: 'Cancelado', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
}

export function TicketCard({ ticket, buyerName, onNameUpdated }: TicketCardProps) {
  const status = statusConfig[ticket.status] ?? statusConfig['PENDING']
  const isAnonymous = ticket.event?.participant_id_type === 'none'
  const initialDisplayName = isAnonymous ? '' : (ticket.buyerName ?? buyerName ?? ticket.buyerEmail ?? '—')
  
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState(isAnonymous ? '' : (ticket.buyerName ?? buyerName ?? ''))
  const [isSavingName, setIsSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  // Só permite editar nome em ingressos do modelo Ticket (não PDF Formal)
  const canEditName = ticket.event?.ticket_layout !== 'formal_pdf'

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

  const issuedDate = ticket.issuedAt ? new Date(ticket.issuedAt) : null
  const issuedDateStr = issuedDate
    ? issuedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null
  const issuedTimeStr = issuedDate
    ? issuedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null

  async function handleSaveName() {
    setIsSavingName(true)
    setNameError(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Sessão expirada. Faça login novamente.')

      await updateTicketBuyerName(ticket.id, editNameValue, session.access_token)
      const newDisplay = editNameValue.trim() || ticket.buyerEmail || '—'
      setDisplayName(newDisplay)
      setIsEditingName(false)
      onNameUpdated?.(ticket.id, editNameValue.trim())
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Erro ao salvar nome.')
    } finally {
      setIsSavingName(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '0.4rem 0.6rem',
    borderRadius: '6px',
    border: '1px solid #6366f1',
    fontSize: '0.9rem',
    outline: 'none',
    fontWeight: 600,
    color: '#0f172a',
  }

  const btnSmall = (bg: string, color: string): React.CSSProperties => ({
    padding: '0.3rem 0.65rem',
    borderRadius: '6px',
    border: 'none',
    background: bg,
    color,
    fontSize: '0.78rem',
    fontWeight: 700,
    cursor: 'pointer',
  })

  return (
    <article
      style={{
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.08em', margin: '0 0 0.4rem' }}>
            {ticket.ticketType?.name?.toUpperCase() ?? 'INGRESSO'}
          </p>
          <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.2 }}>
            {ticket.event?.title ?? 'Evento'}
          </p>
        </div>
        <div
          style={{
            background: status.bg,
            color: status.color,
            border: `1px solid ${status.border}`,
            borderRadius: '20px',
            padding: '0.25rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {status.label}
        </div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#e2e8f0', flexShrink: 0 }} />
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
        </div>

        {/* Portador do ingresso - Ocultar se o tipo de identificação for 'none' */}
        {ticket.event?.participant_id_type !== 'none' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', margin: 0 }}>
                PORTADOR
              </p>
              {canEditName && !isEditingName && (
                <button
                  onClick={() => { setEditNameValue(ticket.buyerName ?? buyerName ?? ''); setIsEditingName(true); setNameError(null) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem 0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#6366f1', fontSize: '0.75rem', fontWeight: 600 }}
                  title="Editar nome do portador"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Editar
                </button>
              )}
            </div>

            {isEditingName ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    placeholder="Nome do portador"
                    style={inputStyle}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveName(); if (e.key === 'Escape') setIsEditingName(false) }}
                  />
                  <button onClick={() => void handleSaveName()} disabled={isSavingName} style={btnSmall('#6366f1', '#fff')}>
                    {isSavingName ? '...' : 'Salvar'}
                  </button>
                  <button onClick={() => setIsEditingName(false)} style={btnSmall('#f1f5f9', '#475569')}>
                    ✕
                  </button>
                </div>
                {nameError && <p style={{ fontSize: '0.75rem', color: '#ef4444', margin: 0 }}>{nameError}</p>}
              </div>
            ) : (
              <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 700, margin: 0 }}>
                {displayName}
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', margin: 0 }}>
              PORTADOR
            </p>
            <div style={{ display: 'inline-flex', alignSelf: 'flex-start', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.3rem 0.55rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
                🎫 Ingresso ao Portador / Transferível
              </span>
            </div>
          </div>
        )}

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
          {issuedDateStr && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.15rem' }}>
                EMITIDO EM
              </p>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.1rem' }}>{issuedDateStr}</p>
                <p style={{ fontSize: '0.75rem', color: '#64748b' }}>às {issuedTimeStr}</p>
              </div>
            </div>
          )}
        </div>

        {/* Ações PDF */}
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
          <TicketPdfGenerator ticket={ticket} buyerName={displayName} buyerCpf={ticket.buyerCpf} />
        </div>
      </div>
    </article>
  )
}

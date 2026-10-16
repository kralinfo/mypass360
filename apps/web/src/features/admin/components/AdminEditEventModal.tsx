'use client'

import type { AdminEventItem } from '@mypass360/types'
import { EventForm } from '@/features/events/components/EventForm'

type AdminEditEventModalProps = {
  event: AdminEventItem
  onClose: () => void
  onSaved?: () => void
}

export function AdminEditEventModal({ event, onClose, onSaved }: AdminEditEventModalProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: '#f8fafc',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '880px',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Modal Top Header */}
        <div
          style={{
            padding: '0.9rem 1.4rem',
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: '#eff6ff',
                color: '#2563eb',
                padding: '0.2rem 0.55rem',
                borderRadius: '6px',
                border: '1px solid #bfdbfe',
              }}
            >
              Painel Admin
            </span>
            <h2
              style={{
                margin: 0,
                fontSize: '1.05rem',
                fontWeight: 700,
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '550px',
              }}
            >
              Editar Evento — {event.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: '1.35rem',
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Modal Body: The full event form with editing enabled */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem 1.5rem 2rem',
          }}
        >
          <EventForm
            editId={event.id}
            isAdmin={true}
            onClose={onClose}
            onSaved={onSaved}
          />
        </div>
      </div>
    </div>
  )
}

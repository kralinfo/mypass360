'use client'

import { useState } from 'react'

interface ScheduleModalProps {
  eventTitle: string
  onConfirm: (publishedAt: string) => Promise<void>
  onClose: () => void
}

export function ScheduleModal({ eventTitle, onConfirm, onClose }: ScheduleModalProps) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!date || !time) {
      setError('Selecione a data e o horário.')
      return
    }

    const publishedAt = new Date(`${date}T${time}:00`).toISOString()

    if (new Date(publishedAt) <= new Date()) {
      setError('A data deve ser no futuro.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onConfirm(publishedAt)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao agendar publicação')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '1rem',
    background: '#fff',
    color: '#0f172a',
    boxSizing: 'border-box',
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '2rem',
          width: '100%',
          maxWidth: '400px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        <h2
          id="schedule-modal-title"
          style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#0f172a', fontWeight: 'bold' }}
        >
          📅 Agendar Publicação
        </h2>
        <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.875rem' }}>
          {eventTitle}
        </p>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '1rem',
              color: '#991b1b',
              fontSize: '0.875rem',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label
              htmlFor="schedule-date"
              style={{ display: 'block', marginBottom: '0.5rem', color: '#334155', fontWeight: '500', fontSize: '0.875rem' }}
            >
              Data de publicação
            </label>
            <input
              type="date"
              id="schedule-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              style={inputStyle}
            />
          </div>

          <div>
            <label
              htmlFor="schedule-time"
              style={{ display: 'block', marginBottom: '0.5rem', color: '#334155', fontWeight: '500', fontSize: '0.875rem' }}
            >
              Horário
            </label>
            <input
              type="time"
              id="schedule-time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: loading ? '#94a3b8' : '#0f172a',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Agendando...' : 'Confirmar'}
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: 'transparent',
              color: '#64748b',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'

interface DeleteConfirmModalProps {
  eventTitle: string
  onConfirm: () => Promise<void>
  onClose: () => void
}

export function DeleteConfirmModal({ eventTitle, onConfirm, onClose }: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir evento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
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
          id="delete-modal-title"
          style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', color: '#ef4444', fontWeight: 'bold' }}
        >
          ⚠️ Excluir Evento
        </h2>
        <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.875rem', lineHeight: 1.4 }}>
          Tem certeza de que deseja excluir o evento <strong>{eventTitle}</strong>? Esta ação é permanente e não poderá ser desfeita.
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

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.75rem',
              background: loading ? '#fca5a5' : '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Excluindo...' : 'Excluir'}
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

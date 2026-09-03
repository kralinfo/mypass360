'use client'

import { useState } from 'react'
import type { AdminEventItem } from '@mypass360/types'

interface AdminDeleteConfirmModalProps {
  event: AdminEventItem
  onConfirm: (event: AdminEventItem, reason: string) => Promise<void>
  onClose: () => void
}

export function AdminDeleteConfirmModal({
  event,
  onConfirm,
  onClose,
}: AdminDeleteConfirmModalProps) {
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) {
      setError('Por favor, informe a justificativa da exclusão.')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      await onConfirm(event, reason.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir o evento.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .del-admin-overlay {
          position: fixed; inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
          animation: fadeIn 0.15s ease;
        }
        .del-admin-modal {
          background: #fff;
          border-radius: 20px;
          width: 100%;
          max-width: 520px;
          overflow: hidden;
          box-shadow: 0 25px 60px -12px rgba(0,0,0,0.35);
          animation: slideUp 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      <div
        className="del-admin-overlay"
        onClick={(e) => e.target === e.currentTarget && !isLoading && onClose()}
      >
        <div className="del-admin-modal">
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
              padding: '1.25rem 1.5rem',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <p
                style={{
                  margin: '0 0 0.2rem',
                  fontSize: '0.72rem',
                  color: '#fca5a5',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                EXCLUSÃO DE EVENTO (PAINEL ADMIN)
              </p>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                Confirmar Exclusão
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px',
                padding: '0.35rem 0.6rem',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem' }}>
            {/* Destaque do Evento */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '0.2rem',
                }}
              >
                Evento Selecionado:
              </span>
              <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                {event.title}
              </strong>
            </div>

            {/* Aviso Importante */}
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                color: '#991b1b',
                fontSize: '0.83rem',
                lineHeight: 1.45,
              }}
            >
              <strong>⚠️ Atenção:</strong> Esta ação desativará/excluirá o evento do sistema. O criador do evento receberá uma notificação em tempo real informando o motivo desta exclusão.
            </div>

            {/* Feedback de Erro */}
            {error && (
              <div
                style={{
                  background: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  color: '#991b1b',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            {/* Justificativa */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="admin-delete-reason"
                style={{
                  display: 'block',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '0.35rem',
                }}
              >
                Justificativa / Motivo da Exclusão <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                id="admin-delete-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Informe a justificativa da exclusão (será enviada ao organizador)..."
                required
                style={{
                  width: '100%',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  padding: '0.65rem',
                  fontSize: '0.88rem',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '0.6rem 1.1rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || !reason.trim()}
                style={{
                  background: isLoading || !reason.trim() ? '#fca5a5' : '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.6rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: isLoading || !reason.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? 'Excluindo...' : 'Confirmar Exclusão 🗑️'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

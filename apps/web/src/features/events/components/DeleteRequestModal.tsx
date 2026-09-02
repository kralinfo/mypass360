'use client'

import { useState } from 'react'

interface DeleteRequestModalProps {
  eventTitle: string
  onConfirm: (reason: string) => Promise<void>
  onClose: () => void
}

export function DeleteRequestModal({ eventTitle, onConfirm, onClose }: DeleteRequestModalProps) {
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmedReason = reason.trim()
    if (!trimmedReason || trimmedReason.length < 5) {
      setError('Por favor, informe o motivo da exclusão (mínimo 5 caracteres).')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onConfirm(trimmedReason)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar solicitação de exclusão.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .delete-request-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: fadeIn 0.15s ease;
        }
        .delete-request-modal {
          background: #ffffff;
          border-radius: 20px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          animation: slideUp 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      <div className="delete-request-overlay" onClick={(e) => e.target === e.currentTarget && !isLoading && onClose()}>
        <div className="delete-request-modal">
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              padding: '1.5rem 1.5rem 1.25rem',
              color: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                }}
              >
                🗑️
              </div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                Solicitar exclusão de evento
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, lineHeight: 1.5 }}>
              Como este evento já foi aprovado ou publicado, a exclusão precisa ser analisada por um administrador.
            </p>
          </div>

          {/* Form / Body */}
          <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem' }}>
            {/* Nome do Evento */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
              }}
            >
              <p
                style={{
                  margin: '0 0 0.2rem',
                  fontSize: '0.72rem',
                  color: '#94a3b8',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Evento selecionado
              </p>
              <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                {eventTitle}
              </p>
            </div>

            {/* Motivo Obrigatório */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="deletion-reason"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#1e293b',
                  marginBottom: '0.4rem',
                }}
              >
                Por que deseja excluir este evento? <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                id="deletion-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Evento cancelado pelo organizador por motivos de força maior..."
                rows={4}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  color: '#0f172a',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
              <span style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.74rem', color: '#64748b' }}>
                Informe uma justificativa clara para ajudar na análise do administrador.
              </span>
            </div>

            {/* Aviso */}
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                marginBottom: '1.25rem',
                fontSize: '0.78rem',
                color: '#92400e',
                lineHeight: 1.5,
              }}
            >
              ⚠️ Durante a análise, o evento ficará temporariamente <strong>indisponível para novas vendas</strong> e marcado como em análise.
            </div>

            {/* Erro */}
            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '1rem',
                  fontSize: '0.82rem',
                  color: '#991b1b',
                }}
              >
                {error}
              </div>
            )}

            {/* Botões */}
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '0.7rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                  transition: 'all 0.15s',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || reason.trim().length < 5}
                style={{
                  flex: 1,
                  padding: '0.7rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: isLoading || reason.trim().length < 5
                    ? '#fca5a5'
                    : 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: isLoading || reason.trim().length < 5 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                {isLoading ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Enviando...
                  </>
                ) : (
                  <>📩 Confirmar solicitação</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

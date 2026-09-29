'use client'

import { useState } from 'react'

interface CancelApprovalModalProps {
  eventTitle: string
  onConfirm: (note?: string) => Promise<void>
  onClose: () => void
}

export function CancelApprovalModal({ eventTitle, onConfirm, onClose }: CancelApprovalModalProps) {
  const [note, setNote] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setIsLoading(true)
    setError(null)
    try {
      await onConfirm(note.trim() || undefined)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao cancelar solicitação.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .cancel-approval-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: fadeIn 0.15s ease;
        }
        .cancel-approval-modal {
          background: #fff;
          border-radius: 20px;
          width: 100%;
          max-width: 460px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          animation: slideUp 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      <div className="cancel-approval-overlay" onClick={(e) => e.target === e.currentTarget && !isLoading && onClose()}>
        <div className="cancel-approval-modal">
          {/* Header */}
          <div style={{
            background: '#ffffff',
            padding: '1.5rem 1.5rem 1.25rem',
            borderBottom: '1px solid #e2e8f0',
          }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              Cancelar solicitação de publicação
            </h2>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
              A solicitação enviada ao administrador será cancelada e o evento voltará para rascunho.
            </p>
          </div>

          {/* Body */}
          <div style={{ padding: '1.25rem 1.5rem' }}>
            {/* Evento */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
            }}>
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Evento
              </p>
              <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                {eventTitle}
              </p>
            </div>

            {/* Observação Opcional */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label htmlFor="cancel-note" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                Observação (opcional)
              </label>
              <textarea
                id="cancel-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex: Preciso fazer ajustes no horário antes de publicar..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  color: '#0f172a',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                color: '#991b1b',
                fontSize: '0.8rem',
                marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            {/* Footer / Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                style={{
                  padding: '0.6rem 1.1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#334155',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isLoading}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                {isLoading ? 'Cancelando...' : 'Cancelar Solicitação'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

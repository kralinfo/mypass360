'use client'

import { useState } from 'react'

interface PublishRequestModalProps {
  eventTitle: string
  onConfirm: () => Promise<void>
  onClose: () => void
}

export function PublishRequestModal({ eventTitle, onConfirm, onClose }: PublishRequestModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setIsLoading(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar publicação.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .publish-request-overlay {
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
        .publish-request-modal {
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

      <div className="publish-request-overlay" onClick={(e) => e.target === e.currentTarget && !isLoading && onClose()}>
        <div className="publish-request-modal">
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            padding: '1.5rem 1.5rem 1.25rem',
            color: '#fff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{
                width: 40, height: 40,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem',
              }}>
                🚀
              </div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                Solicitar publicação
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.85, lineHeight: 1.5 }}>
              Seu evento será enviado para análise administrativa antes de ser publicado.
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
                Evento selecionado
              </p>
              <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                {eventTitle}
              </p>
            </div>

            {/* Fluxo */}
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                Como funciona:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { icon: '📤', text: 'Sua solicitação é enviada para análise' },
                  { icon: '🔍', text: 'Um administrador revisa as informações do evento' },
                  { icon: '✅', text: 'Após aprovação, o botão "Publicar" é liberado para você' },
                  { icon: '🎉', text: 'Você decide o momento exato de publicar' },
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.95rem', flexShrink: 0, marginTop: '0.05rem' }}>{step.icon}</span>
                    <span style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>{step.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Aviso */}
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              marginBottom: '1.25rem',
              fontSize: '0.78rem',
              color: '#92400e',
              lineHeight: 1.5,
            }}>
              ⚠️ Após enviar a solicitação, o evento ficará em modo <strong>&quot;Aguardando aprovação&quot;</strong> e não poderá ser publicado até a decisão do administrador.
            </div>

            {/* Erro */}
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                marginBottom: '1rem',
                fontSize: '0.82rem',
                color: '#991b1b',
              }}>
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
                type="button"
                onClick={handleConfirm}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '0.7rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: isLoading ? '#a5b4fc' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
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
                  <>🚀 Confirmar solicitação</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

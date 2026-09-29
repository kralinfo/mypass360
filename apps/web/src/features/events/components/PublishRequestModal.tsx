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
          background: rgba(15, 23, 42, 0.6);
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
          border-radius: 16px;
          width: 100%;
          max-width: 480px;
          max-height: 88vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
          animation: slideUp 0.2s ease;
        }
        .publish-request-body {
          padding: 1.15rem 1.25rem;
          overflow-y: auto;
          flex: 1;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="publish-request-overlay" onClick={(e) => e.target === e.currentTarget && !isLoading && onClose()}>
        <div className="publish-request-modal">
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            padding: '1.15rem 1.25rem 1rem',
            color: '#fff',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.25rem' }}>
                <div style={{
                  width: 32, height: 32,
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem',
                }}>
                  🚀
                </div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  Solicitar publicação
                </h2>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.9, lineHeight: 1.4 }}>
                Seu evento será enviado para análise da administração antes de ir ao ar.
              </p>
            </div>

            {/* Botão Fechar (✕) */}
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#ffffff',
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              title="Fechar"
            >
              ✕
            </button>
          </div>

          {/* Body com Scroll Suave */}
          <div className="publish-request-body">
            {/* Evento Selecionado */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.75rem 0.9rem',
              marginBottom: '1rem',
            }}>
              <p style={{ margin: '0 0 0.15rem', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Evento selecionado
              </p>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                {eventTitle}
              </p>
            </div>

            {/* Passo a passo compacto */}
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                Como funciona:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {[
                  { icon: '📤', title: '1. Envio', desc: 'Solicitação enviada ao admin' },
                  { icon: '🔍', title: '2. Análise', desc: 'Administrador revisa os dados' },
                  { icon: '✅', title: '3. Aprovação', desc: 'Botão "Publicar" é liberado' },
                  { icon: '🎉', title: '4. Publicação', desc: 'Você publica quando desejar' },
                ].map((step, i) => (
                  <div key={i} style={{
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '8px',
                    padding: '0.5rem 0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                  }}>
                    <span style={{ fontSize: '0.9rem' }}>{step.icon}</span>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>{step.title}</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.2 }}>{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lembrete Financeiro Compacto */}
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              padding: '0.75rem 0.9rem',
              marginBottom: '1rem',
              fontSize: '0.78rem',
              color: '#166534',
              lineHeight: 1.45,
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#15803d', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>💰</span> Recebimento das vendas:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <li>Repasse na sua conta em <strong>até 3 dias úteis</strong> pós-evento.</li>
                <li>Taxa: <strong>10% + 2% a 2,5%</strong> por venda. Transferência grátis para BB, Bradesco, Itaú e Santander.</li>
              </ul>
            </div>

            {/* Aviso de Segurança Compacto */}
            <div style={{
              background: '#fffbe8',
              border: '1px solid #fde047',
              borderRadius: '9px',
              padding: '0.65rem 0.85rem',
              marginBottom: '1rem',
              fontSize: '0.76rem',
              color: '#713f12',
              lineHeight: 1.4,
            }}>
              ⚠️ <strong>Importante:</strong> Confira data, local e valores. Após a solicitação, o evento entra em análise e esses dados não poderão ser editados.
            </div>

            {/* Mensagem de Erro */}
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '0.55rem 0.75rem',
                marginBottom: '0.85rem',
                fontSize: '0.78rem',
                color: '#991b1b',
              }}>
                {error}
              </div>
            )}

            {/* Footer / Botões de Ação */}
            <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.25rem' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '9px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.85rem',
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
                  flex: 1.2,
                  padding: '0.65rem',
                  borderRadius: '9px',
                  border: 'none',
                  background: isLoading ? '#a5b4fc' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
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
    </>
  )
}

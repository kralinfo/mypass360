'use client'

import type { AdminEventItem } from '@mypass360/types'
import { useEffect } from 'react'

export type ReminderModalState = 'confirm' | 'loading' | 'success' | 'error'

type ReminderModalProps = {
  event: AdminEventItem | null
  state: ReminderModalState
  sentCount?: number
  errorMessage?: string
  onConfirm: () => void
  onClose: () => void
}

export function ReminderModal({ event, state, sentCount, errorMessage, onConfirm, onClose }: ReminderModalProps) {
  const pendingCount = event ? event.totalOrders - event.paidOrders : 0

  // Fechar com ESC (exceto durante loading)
  useEffect(() => {
    if (state === 'loading') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [state, onClose])

  if (!event) return null

  const headerBg =
    state === 'success'
      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
      : state === 'error'
        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
        : state === 'loading'
          ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
          : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'

  const headerTitle =
    state === 'confirm' ? 'Enviar lembretes?' :
    state === 'loading' ? 'Enviando e-mails...' :
    state === 'success' ? 'Lembretes enviados!' : 'Erro ao enviar'

  const headerIcon =
    state === 'loading' ? null :
    state === 'confirm' ? '📨' :
    state === 'success' ? '✅' : '❌'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={state === 'loading' ? undefined : onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 6, 23, 0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          animation: 'rmFadeIn 0.18s ease',
        }}
      />

      {/* Modal card */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1001,
          width: '100%',
          maxWidth: '440px',
          padding: '0 1rem',
          animation: 'rmSlideUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            boxShadow: '0 24px 60px rgba(2, 6, 23, 0.18), 0 4px 16px rgba(2, 6, 23, 0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Header colorido */}
          <div
            style={{
              background: headerBg,
              padding: '28px 28px 24px',
              color: '#fff',
              textAlign: 'center',
              transition: 'background 0.35s ease',
            }}
          >
            <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
              {state === 'loading' ? (
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    border: '4px solid rgba(255,255,255,0.25)',
                    borderTopColor: '#ffffff',
                    animation: 'rmSpin 0.7s linear infinite',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem',
                    animation: state === 'success' ? 'rmPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
                  }}
                >
                  {headerIcon}
                </div>
              )}
            </div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.01em' }}>
              {headerTitle}
            </p>
          </div>

          {/* Corpo */}
          <div style={{ padding: '24px 28px 28px' }}>

            {/* --- CONFIRM --- */}
            {state === 'confirm' && (
              <>
                <p style={{ margin: '0 0 4px', color: '#0f172a', fontWeight: 700, fontSize: '0.98rem' }}>
                  {event.title}
                </p>
                <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  Serão enviados e-mails de lembrete para{' '}
                  <strong style={{ color: '#0f172a' }}>
                    {pendingCount} pedido{pendingCount !== 1 ? 's' : ''} pendente{pendingCount !== 1 ? 's' : ''}
                  </strong>.
                  Cada cliente receberá um link direto para concluir o pagamento.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      flex: 1, padding: '0.72rem', borderRadius: '12px',
                      border: '1px solid #e2e8f0', background: '#f8fafc',
                      color: '#64748b', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    style={{
                      flex: 2, padding: '0.72rem', borderRadius: '12px',
                      border: 'none', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: '#ffffff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
                    }}
                  >
                    Enviar lembretes
                  </button>
                </div>
              </>
            )}

            {/* --- LOADING --- */}
            {state === 'loading' && (
              <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                <p style={{ margin: '0 0 8px', color: '#0f172a', fontWeight: 600 }}>
                  Aguarde um momento...
                </p>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', lineHeight: 1.6 }}>
                  Estamos enviando os e-mails para todos os clientes com pedidos pendentes.
                  Isso pode levar alguns segundos.
                </p>
              </div>
            )}

            {/* --- SUCCESS --- */}
            {state === 'success' && (
              <>
                <p style={{ margin: '0 0 8px', color: '#0f172a', fontWeight: 700, textAlign: 'center', fontSize: '1.05rem' }}>
                  {sentCount === 0
                    ? 'Nenhum e-mail enviado'
                    : `${sentCount} e-mail${sentCount !== 1 ? 's' : ''} enviado${sentCount !== 1 ? 's' : ''}!`}
                </p>
                <p style={{ margin: '0 0 22px', color: '#64748b', fontSize: '0.88rem', textAlign: 'center', lineHeight: 1.6 }}>
                  {sentCount === 0
                    ? 'Nenhum pedido pendente com usuário identificado foi encontrado.'
                    : 'Os clientes receberão um link direto para finalizar o pagamento na página de checkout.'}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    width: '100%', padding: '0.72rem', borderRadius: '12px',
                    border: 'none', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  Fechar
                </button>
              </>
            )}

            {/* --- ERROR --- */}
            {state === 'error' && (
              <>
                <p style={{ margin: '0 0 8px', color: '#0f172a', fontWeight: 600, textAlign: 'center' }}>
                  Algo deu errado
                </p>
                <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '0.88rem', textAlign: 'center', lineHeight: 1.6 }}>
                  {errorMessage ?? 'Não foi possível enviar os lembretes. Tente novamente.'}
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      flex: 1, padding: '0.72rem', borderRadius: '12px',
                      border: '1px solid #e2e8f0', background: '#f8fafc',
                      color: '#64748b', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                    }}
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={onConfirm}
                    style={{
                      flex: 2, padding: '0.72rem', borderRadius: '12px',
                      border: 'none', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: '#ffffff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                    }}
                  >
                    Tentar novamente
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes rmFadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes rmSlideUp {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 28px)); }
          to   { opacity: 1; transform: translate(-50%, -50%); }
        }
        @keyframes rmSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes rmPopIn {
          from { transform: scale(0.4); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </>
  )
}

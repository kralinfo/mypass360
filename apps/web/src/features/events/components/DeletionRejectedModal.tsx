'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fetchEventMessages } from '../services/my-events.service'

interface EventMessageItem {
  id: string
  sender: 'admin' | 'organizer'
  senderName: string
  message: string
  createdAt: string
}

interface DeletionRejectedModalProps {
  eventId: string
  eventTitle: string
  rejectionReason?: string | null
  onSendReply: (reply: string) => Promise<void>
  onClose: () => void
}

export function DeletionRejectedModal({
  eventId,
  eventTitle,
  rejectionReason,
  onSendReply,
  onClose,
}: DeletionRejectedModalProps) {
  const [reply, setReply] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const [messages, setMessages] = useState<EventMessageItem[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)

  const loadMessages = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const data = await fetchEventMessages(eventId, session.access_token)
      setMessages(data)
    } catch {
      // Ignora erro no histórico
    } finally {
      setIsLoadingMessages(false)
    }
  }, [eventId])

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedReply = reply.trim()
    if (!trimmedReply || trimmedReply.length < 2) {
      setError('Por favor, digite sua resposta para a administração.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onSendReply(trimmedReply)
      setIsSuccess(true)
      setReply('')
      void loadMessages()
      setTimeout(() => {
        setIsSuccess(false)
      }, 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar resposta.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .deletion-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
          animation: delFadeIn 0.15s ease;
        }
        .deletion-modal-card {
          background: #ffffff;
          border-radius: 20px;
          width: 100%;
          max-width: 540px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3);
          animation: delSlideUp 0.2s ease;
        }
        @keyframes delFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes delSlideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      <div className="deletion-modal-overlay" onClick={(e) => e.target === e.currentTarget && !isLoading && onClose()}>
        <div className="deletion-modal-card">

          {/* Cabeçalho */}
          <div style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            padding: '1.25rem 1.5rem', color: '#fff',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
            boxShadow: '0 4px 12px rgba(153, 27, 27, 0.2)',
          }}>
            <div>
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.72rem', color: '#fecaca', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                🛡️ SOLICITAÇÃO DE EXCLUSÃO MANTIDA / REJEITADA
              </p>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                {eventTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px', padding: '0.35rem 0.6rem',
                color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
              }}
            >
              ✕
            </button>
          </div>

          {/* Corpo do Modal (rolável) */}
          <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>

            {/* Banner com o Motivo da Reprovação */}
            <div
              style={{
                background: '#fef2f2',
                border: '2px solid #fca5a5',
                borderRadius: '14px',
                padding: '1rem 1.15rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.3rem' }}>🛑</span>
                <strong style={{ fontSize: '0.95rem', color: '#991b1b' }}>
                  Exclusão Não Autorizada
                </strong>
              </div>

              <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#7f1d1d', lineHeight: 1.45 }}>
                A administração analisou o seu pedido de exclusão e optou por <strong>manter o evento disponível</strong>.
              </p>

              {rejectionReason ? (
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  padding: '0.75rem 0.9rem',
                  marginTop: '0.5rem',
                }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', display: 'block', marginBottom: '0.2rem' }}>
                    Motivo / Resposta do Administrador:
                  </span>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#0f172a', fontWeight: 600, lineHeight: 1.45 }}>
                    &quot;{rejectionReason}&quot;
                  </p>
                </div>
              ) : (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#991b1b', fontStyle: 'italic' }}>
                  O administrador não inseriu uma justificativa por texto.
                </p>
              )}

              <p style={{ margin: '0.75rem 0 0', fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                ℹ️ <strong>Status atual:</strong> O evento continua publicado e ativo na plataforma para compra ou acesso dos participantes.
              </p>
            </div>

            {/* Histórico do Diálogo / Conversa */}
            {!isLoadingMessages && messages.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ margin: '0 0 0.4rem', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  💬 Mensagens Anteriores com a Administração ({messages.length})
                </p>
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '0.5rem',
                  maxHeight: '180px', overflowY: 'auto',
                  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem',
                }}>
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: m.sender === 'organizer' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        background: m.sender === 'organizer' ? '#4f46e5' : '#ffffff',
                        color: m.sender === 'organizer' ? '#ffffff' : '#0f172a',
                        border: m.sender === 'organizer' ? 'none' : '1px solid #cbd5e1',
                        borderRadius: '12px',
                        padding: '0.55rem 0.8rem',
                        fontSize: '0.82rem',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', opacity: 0.8, marginBottom: '0.15rem', fontWeight: 700 }}>
                        {m.sender === 'organizer' ? 'Você (Organizador)' : '🛡️ Administração'}
                      </div>
                      <p style={{ margin: 0, lineHeight: 1.4 }}>{m.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulário de Resposta para a Administração */}
            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                💬 Enviar uma mensagem / dúvida para a administração:
              </label>

              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                disabled={isLoading}
                placeholder="Escreva sua mensagem ou esclarecimento aqui..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />

              {error && (
                <p style={{ margin: '0.4rem 0 0', color: '#dc2626', fontSize: '0.78rem', fontWeight: 600 }}>
                  ⚠️ {error}
                </p>
              )}

              {isSuccess && (
                <p style={{ margin: '0.4rem 0 0', color: '#16a34a', fontSize: '0.78rem', fontWeight: 700 }}>
                  ✓ Resposta enviada com sucesso para os administradores!
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#475569',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !reply.trim()}
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: isLoading || !reply.trim() ? '#94a3b8' : '#0f172a',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: isLoading || !reply.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isLoading ? 'Enviando...' : 'Enviar Resposta'}
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    </>
  )
}

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

interface AdminMessageDialogModalProps {
  eventId: string
  eventTitle: string
  adminMessage: string
  onSendReply: (reply: string) => Promise<void>
  onClose: () => void
}

export function AdminMessageDialogModal({
  eventId,
  eventTitle,
  adminMessage,
  onSendReply,
  onClose,
}: AdminMessageDialogModalProps) {
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
      void loadMessages()
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar resposta.')
      setIsLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .admin-dialog-overlay {
          position: fixed; inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
          animation: fadeIn 0.15s ease;
        }
        .admin-dialog-modal {
          background: #ffffff;
          border-radius: 20px;
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3);
          animation: slideUp 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      <div className="admin-dialog-overlay" onClick={(e) => e.target === e.currentTarget && !isLoading && onClose()}>
        <div className="admin-dialog-modal">

          {/* Header (Fixo no topo) */}
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
            padding: '1.25rem 1.5rem', color: '#fff',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            <div>
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.72rem', color: '#c7d2fe', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                MENSAGEM DA ADMINISTRAÇÃO
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
                color: '#fff', cursor: 'pointer', fontSize: '0.8rem',
              }}
            >
              ✕
            </button>
          </div>

          {/* Body (Rolável) */}
          <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>

            {/* Histórico do Diálogo / Conversa */}
            {messages.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ margin: '0 0 0.4rem', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  💬 Histórico do Diálogo ({messages.length})
                </p>
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '0.5rem',
                  maxHeight: '180px', overflowY: 'auto',
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: '12px', padding: '0.75rem',
                }}>
                  {messages.map((m) => {
                    const isAdmin = m.sender === 'admin'
                    return (
                      <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isAdmin ? 'flex-start' : 'flex-end' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isAdmin ? '#4f46e5' : '#059669', marginBottom: '0.1rem' }}>
                          {isAdmin ? '🛡️ Administração' : '👤 Sua Resposta'}
                        </div>
                        <div style={{
                          background: isAdmin ? '#eef2ff' : '#ffffff',
                          border: isAdmin ? '1px solid #c7d2fe' : '1px solid #cbd5e1',
                          borderRadius: '10px', padding: '0.5rem 0.75rem', maxWidth: '85%',
                          fontSize: '0.83rem', color: '#1e293b', lineHeight: 1.4,
                        }}>
                          {m.message}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Mensagem quando não há histórico ainda */}
            {messages.length === 0 && (
              <div style={{
                background: '#eef2ff', border: '1.5px solid #c7d2fe',
                borderRadius: '12px', padding: '1rem',
                marginBottom: '1.25rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>💬</span>
                  <strong style={{ fontSize: '0.82rem', color: '#3730a3', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Canal Direto com a Administração
                  </strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#1e1b4b', lineHeight: 1.55 }}>
                  Use este espaço para tirar dúvidas, enviar observações ou trocar mensagens diretamente com a equipe de administração do MyPass360 sobre este evento.
                </p>
              </div>
            )}

            {isSuccess ? (
              <div style={{
                background: '#f0fdf4', border: '1px solid #86efac',
                borderRadius: '12px', padding: '1.25rem',
                textAlign: 'center', color: '#15803d', fontWeight: 700, fontSize: '0.95rem',
              }}>
                ✅ Mensagem enviada à administração com sucesso!
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label
                    htmlFor="reply-message"
                    style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem' }}
                  >
                    {messages.length > 0 ? 'Sua mensagem de retorno para a administração' : 'Sua mensagem para a administração'} <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    id="reply-message"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Digite sua resposta ou esclarecimento..."
                    rows={4}
                    required
                    style={{
                      width: '100%', padding: '0.75rem 0.85rem',
                      borderRadius: '10px', border: '1px solid #cbd5e1',
                      fontSize: '0.88rem', color: '#0f172a',
                      fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                      resize: 'vertical',
                    }}
                  />
                  <span style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.74rem', color: '#64748b' }}>
                    Sua resposta será enviada em tempo real para a equipe de administradores.
                  </span>
                </div>

                {error && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.65rem 0.85rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#991b1b' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    style={{
                      flex: 1, padding: '0.7rem', borderRadius: '10px',
                      border: '1px solid #cbd5e1', background: '#f8fafc',
                      color: '#475569', fontWeight: 600, fontSize: '0.88rem',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !reply.trim()}
                    style={{
                      flex: 1, padding: '0.7rem', borderRadius: '10px',
                      border: 'none', background: isLoading || !reply.trim() ? '#a5b4fc' : 'linear-gradient(135deg, #4f46e5, #3730a3)',
                      color: '#ffffff', fontWeight: 700, fontSize: '0.88rem',
                      cursor: isLoading || !reply.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isLoading ? 'Enviando...' : '📩 Enviar resposta'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

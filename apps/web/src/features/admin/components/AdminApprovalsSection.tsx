'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { PendingApprovalEventItem } from '@mypass360/types'
import {
  fetchPendingApprovals,
  approveEventPublication,
  rejectEventPublication,
  fetchEventMessages,
  contactEventOrganizer,
  type EventMessageItem,
} from '../admin.service'
import { formatDate, formatCurrency } from '../admin.utils'

// ── Ícones ─────────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const CalendarIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const MapPinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

const UserIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const TicketIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
    <path d="M13 5v14" />
  </svg>
)

const UsersIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

// ── Modal de Revisão de Evento ──────────────────────────────────────────────
interface ReviewModalProps {
  event: PendingApprovalEventItem
  onApprove: () => Promise<void>
  onReject: (reason?: string) => Promise<void>
  onClose: () => void
}

function ReviewModal({ event, onApprove, onReject, onClose }: ReviewModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | 'contact' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [messages, setMessages] = useState<EventMessageItem[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const loadMessages = useCallback(async () => {
    setIsLoadingMessages(true)
    try {
      const history = await fetchEventMessages(event.id)
      setMessages(history)
    } catch {
      // Ignora falha de histórico se for 1º contato
    } finally {
      setIsLoadingMessages(false)
    }
  }, [event.id])

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  const formattedEventDate = new Date(event.date).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  async function handleApprove() {
    setIsLoading(true)
    setError(null)
    try {
      await onApprove()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao aprovar.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleReject() {
    setIsLoading(true)
    setError(null)
    try {
      await onReject(rejectionReason.trim() || undefined)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao rejeitar.')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleContact() {
    if (!contactMessage.trim()) {
      setError('Por favor, digite a mensagem a ser enviada ao organizador.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      await contactEventOrganizer(event.id, contactMessage.trim())
      setSuccessMsg('Mensagem enviada ao organizador com sucesso!')
      setContactMessage('')
      void loadMessages()
      setTimeout(() => {
        setAction(null)
        setSuccessMsg(null)
      }, 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .review-overlay {
          position: fixed; inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          z-index: 9998;
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
          animation: fadeIn 0.15s ease;
        }
        .review-modal {
          background: #fff;
          border-radius: 20px;
          width: 100%;
          max-width: 640px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 60px -12px rgba(0,0,0,0.35);
          animation: slideUp 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
      <div className="review-overlay" onClick={(e) => e.target === e.currentTarget && !isLoading && onClose()}>
        <div className="review-modal">

          {/* Header (Fixo no topo) */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            padding: '1.25rem 1.5rem',
            color: '#fff',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            <div>
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                ANÁLISE DE PUBLICAÇÃO
              </p>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.3 }}>
                {event.title}
              </h2>
              {event.genre && (
                <span style={{
                  display: 'inline-block', marginTop: '0.4rem',
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '999px', padding: '2px 8px',
                  fontSize: '0.7rem', color: '#e2e8f0',
                }}>
                  {event.genre}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '8px', padding: '0.35rem 0.6rem',
                color: '#e2e8f0', cursor: 'pointer', fontSize: '0.8rem',
              }}
            >
              ✕
            </button>
          </div>

          {/* Body (Rolável) */}
          <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>

            {/* Imagem do evento */}
            {event.imageUrl && (
              <div style={{ width: '100%', height: '200px', overflow: 'hidden', borderRadius: '12px', marginBottom: '1.25rem' }}>
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}

            {/* Informações do evento */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <InfoCard icon={<CalendarIcon />} label="Data do evento" value={formattedEventDate} />
              <InfoCard icon={<MapPinIcon />} label="Local" value={event.location} />
              <InfoCard icon={<UsersIcon />} label="Capacidade" value={`${event.capacity.toLocaleString('pt-BR')} pessoas`} />
              <InfoCard icon={<TicketIcon />} label="Preço base" value={event.price === 0 ? 'Gratuito' : formatCurrency(event.price)} />
            </div>

            {/* Descrição */}
            {event.description && (
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ margin: '0 0 0.4rem', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Descrição
                </p>
                <p style={{
                  margin: 0, fontSize: '0.87rem', color: '#334155', lineHeight: 1.65,
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: '10px', padding: '0.85rem 1rem',
                  maxHeight: '120px', overflowY: 'auto',
                }}>
                  {event.description}
                </p>
              </div>
            )}

            {/* Tipos de ingresso */}
            {event.ticketTypes && event.ticketTypes.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ margin: '0 0 0.6rem', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Ingressos ({event.ticketTypes.length} tipo{event.ticketTypes.length > 1 ? 's' : ''})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {event.ticketTypes.map((tt) => (
                    <div key={tt.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: '8px', padding: '0.6rem 0.85rem',
                    }}>
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{tt.name}</span>
                        {tt.description && (
                          <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>{tt.description}</span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.75rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>
                          {tt.price === 0 ? 'Gratuito' : formatCurrency(tt.price)}
                        </span>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8' }}>
                          {tt.quantity.toLocaleString('pt-BR')} disponíveis
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Organizador */}
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: '10px', padding: '0.85rem 1rem',
              marginBottom: '1.25rem',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: '#16a34a', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, fontSize: '0.8rem', fontWeight: 700,
              }}>
                {(event.organizerName || event.organizerEmail || 'O').charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#15803d', fontWeight: 600 }}>Organizador</p>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#166534', fontWeight: 700 }}>
                  {event.organizerName || 'Sem nome'}
                </p>
                {event.organizerEmail && (
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#16a34a' }}>{event.organizerEmail}</p>
                )}
              </div>
            </div>

            {/* Histórico de Mensagens / Diálogo com Organizador */}
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                💬 LINHA DO TEMPO DA CONVERSA ({messages.length})
              </p>
              {isLoadingMessages ? (
                <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                  Carregando histórico...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#64748b', fontSize: '0.82rem' }}>
                  Nenhuma mensagem trocada ainda com o organizador deste evento.
                </div>
              ) : (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: '0.5rem',
                  maxHeight: '180px', overflowY: 'auto',
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: '10px', padding: '0.75rem',
                }}>
                  {messages.map((m) => {
                    const isAdmin = m.sender === 'admin'
                    return (
                      <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isAdmin ? 'flex-end' : 'flex-start' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isAdmin ? '#4f46e5' : '#059669', marginBottom: '0.1rem' }}>
                          {isAdmin ? '🛡️ Você (Administração)' : '👤 Organizador'}
                        </div>
                        <div style={{
                          background: isAdmin ? '#eef2ff' : '#ffffff',
                          border: isAdmin ? '1px solid #c7d2fe' : '1px solid #cbd5e1',
                          borderRadius: '8px', padding: '0.5rem 0.7rem', maxWidth: '88%',
                          fontSize: '0.82rem', color: '#1e293b', lineHeight: 1.4,
                        }}>
                          {m.message}
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                          {new Date(m.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Data da solicitação */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              marginBottom: '1.25rem',
              fontSize: '0.8rem', color: '#64748b',
            }}>
              <span style={{ display: 'flex', color: '#94a3b8' }}><CalendarIcon /></span>
              <span>Solicitação enviada em: <strong style={{ color: '#475569' }}>{formatDate(event.approvalRequestedAt)}</strong></span>
            </div>

            {/* ── Ações ── */}
            {action === null && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setAction('reject')}
                  style={{
                    flex: 1, minWidth: '120px', padding: '0.75rem', borderRadius: '12px',
                    border: '1.5px solid #fca5a5',
                    background: '#fff', color: '#dc2626',
                    fontWeight: 700, fontSize: '0.88rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fff' }}
                >
                  <XIcon />
                  Rejeitar
                </button>
                <button
                  type="button"
                  onClick={() => setAction('contact')}
                  style={{
                    flex: 1, minWidth: '140px', padding: '0.75rem', borderRadius: '12px',
                    border: '1.5px solid #c7d2fe',
                    background: '#eef2ff', color: '#4f46e5',
                    fontWeight: 700, fontSize: '0.88rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  }}
                >
                  💬 Enviar Mensagem
                </button>
                <button
                  type="button"
                  onClick={() => setAction('approve')}
                  style={{
                    flex: 1, minWidth: '120px', padding: '0.75rem', borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                    color: '#fff',
                    fontWeight: 700, fontSize: '0.88rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                  }}
                >
                  <CheckIcon />
                  Aprovar
                </button>
              </div>
            )}

            {/* Confirmação de aprovação */}
            {action === 'approve' && (
              <div style={{
                background: '#f0fdf4', border: '1px solid #86efac',
                borderRadius: '12px', padding: '1rem',
              }}>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', fontWeight: 700, color: '#15803d' }}>
                  ✅ Confirmar aprovação?
                </p>
                <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#166534', lineHeight: 1.5 }}>
                  O organizador receberá permissão para publicar o evento. O evento NÃO será publicado automaticamente — o organizador ainda precisará clicar em &quot;Publicar&quot;.
                </p>
                {error && <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: '#dc2626' }}>{error}</p>}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={() => { setAction(null); setError(null) }} disabled={isLoading}
                    style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #bbf7d0', background: '#fff', color: '#15803d', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                    Voltar
                  </button>
                  <button type="button" onClick={handleApprove} disabled={isLoading}
                    style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                    {isLoading ? 'Aprovando...' : 'Sim, aprovar'}
                  </button>
                </div>
              </div>
            )}

            {/* Enviar mensagem ao organizador */}
            {action === 'contact' && (
              <div style={{
                background: '#eef2ff', border: '1px solid #c7d2fe',
                borderRadius: '12px', padding: '1rem',
              }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.88rem', fontWeight: 700, color: '#3730a3' }}>
                  💬 Enviar Mensagem ao Organizador
                </p>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: '#4338ca', lineHeight: 1.45 }}>
                  O organizador receberá uma notificação direta com esta mensagem.
                </p>

                {successMsg && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '0.6rem', marginBottom: '0.75rem', color: '#15803d', fontWeight: 700, fontSize: '0.82rem', textAlign: 'center' }}>
                    {successMsg}
                  </div>
                )}

                {error && <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: '#dc2626' }}>{error}</p>}

                <div style={{ marginBottom: '0.85rem' }}>
                  <textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Escreva sua mensagem ou dúvida ao organizador..."
                    rows={3}
                    style={{
                      width: '100%', resize: 'vertical',
                      padding: '0.6rem 0.75rem', borderRadius: '8px',
                      border: '1px solid #a5b4fc', background: '#fff',
                      fontSize: '0.84rem', color: '#1e293b', outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => { setAction(null); setError(null); setSuccessMsg(null) }}
                    disabled={isLoading}
                    style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #c7d2fe', background: '#fff', color: '#4338ca', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleContact}
                    disabled={isLoading || !contactMessage.trim()}
                    style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: isLoading || !contactMessage.trim() ? 'not-allowed' : 'pointer' }}
                  >
                    {isLoading ? 'Enviando...' : 'Enviar Mensagem 💬'}
                  </button>
                </div>
              </div>
            )}

            {/* Confirmação de rejeição */}
            {action === 'reject' && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fca5a5',
                borderRadius: '12px', padding: '1rem',
              }}>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', fontWeight: 700, color: '#991b1b' }}>
                  ❌ Confirmar rejeição?
                </p>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: '#991b1b', lineHeight: 1.5 }}>
                  O organizador será notificado e poderá editar o evento e solicitar novamente.
                </p>
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#7f1d1d', marginBottom: '0.35rem' }}>
                    Motivo da rejeição <span style={{ fontWeight: 400, color: '#9ca3af' }}>(opcional)</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Ex: Imagem de capa ausente, descrição incompleta..."
                    rows={3}
                    style={{
                      width: '100%', resize: 'vertical',
                      padding: '0.6rem 0.75rem', borderRadius: '8px',
                      border: '1px solid #fca5a5', background: '#fff',
                      fontSize: '0.83rem', color: '#1e293b',
                      fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                {error && <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: '#dc2626' }}>{error}</p>}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={() => { setAction(null); setError(null) }} disabled={isLoading}
                    style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fff', color: '#991b1b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                    Voltar
                  </button>
                  <button type="button" onClick={handleReject} disabled={isLoading}
                    style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                    {isLoading ? 'Rejeitando...' : 'Sim, rejeitar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── InfoCard helper ────────────────────────────────────────────────────────
function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{
      background: '#f8fafc', border: '1px solid #e2e8f0',
      borderRadius: '10px', padding: '0.75rem 0.85rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
        <span style={{ color: '#94a3b8' }}>{icon}</span>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.4 }}>{value}</p>
    </div>
  )
}

// ── Componente principal: AdminApprovalsSection ────────────────────────────
export function AdminApprovalsSection() {
  const searchParams = useSearchParams()
  const targetEventId = searchParams.get('event_id')

  const [items, setItems] = useState<PendingApprovalEventItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<PendingApprovalEventItem | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchPendingApprovals()
      setItems(data)

      // Se tiver event_id na URL, seleciona automaticamente para abrir o modal de revisão
      if (targetEventId) {
        const found = data.find((e) => e.id === targetEventId)
        if (found) {
          setSelectedEvent(found)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar solicitações.')
    } finally {
      setIsLoading(false)
    }
  }, [targetEventId])

  useEffect(() => { void load() }, [load])

  async function handleApprove(eventId: string) {
    await approveEventPublication(eventId)
    await load()
  }

  async function handleReject(eventId: string, reason?: string) {
    await rejectEventPublication(eventId, reason)
    await load()
  }

  return (
    <section>
      {/* Header da seção */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div>
          {isLoading ? null : (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: items.length > 0 ? '#7c3aed' : '#64748b',
              color: '#fff', borderRadius: '999px',
              padding: '0.2rem 0.75rem', fontSize: '0.78rem', fontWeight: 700,
            }}>
              {items.length > 0 ? `${items.length} pendente${items.length > 1 ? 's' : ''}` : 'Nenhuma pendente'}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={isLoading}
          style={{
            border: '1px solid #e2e8f0', borderRadius: '10px',
            padding: '0.5rem 1rem', background: '#fff',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            color: '#0f172a', fontWeight: 600, fontSize: '0.84rem',
          }}
        >
          {isLoading ? 'Atualizando...' : '↻ Atualizar'}
        </button>
      </div>

      {/* Erro */}
      {error && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fecaca',
          borderRadius: '12px', padding: '1rem 1.25rem',
          color: '#991b1b', marginBottom: '1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Estado de carregamento */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              height: '100px', borderRadius: '14px',
              background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
            }} />
          ))}
        </div>
      )}

      {/* Lista vazia */}
      {!isLoading && !error && items.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem',
          background: '#f8fafc', border: '1px dashed #cbd5e1',
          borderRadius: '16px',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>
            Nenhuma solicitação pendente
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
            Todas as solicitações de publicação foram analisadas.
          </p>
        </div>
      )}

      {/* Lista de solicitações */}
      {!isLoading && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map((item) => (
            <article
              key={item.id}
              style={{
                background: '#fff', border: '1px solid #e2e8f0',
                borderRadius: '16px', overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex', flexDirection: 'row',
                cursor: 'pointer', transition: 'box-shadow 0.15s',
              }}
              onClick={() => setSelectedEvent(item)}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              {/* Thumb da imagem */}
              <div style={{
                width: '100px', flexShrink: 0,
                background: 'linear-gradient(135deg, #312e81, #4338ca)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem', color: '#c7d2fe', overflow: 'hidden',
              }}>
                {item.imageUrl
                  ? <img src={item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : '🎟️'
                }
              </div>

              {/* Informações */}
              <div style={{ flex: 1, padding: '0.85rem 1rem', minWidth: 0 }}>
                {/* Badge de pendente */}
                <div style={{ marginBottom: '0.35rem' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: '#f5f3ff', border: '1px solid #c4b5fd',
                    color: '#7c3aed', borderRadius: '999px',
                    padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#8b5cf6', display: 'inline-block' }} />
                    Aguardando aprovação
                  </span>
                </div>

                <h3 style={{
                  margin: '0 0 0.3rem', fontSize: '0.95rem', fontWeight: 700,
                  color: '#0f172a', lineHeight: 1.3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {item.title}
                </h3>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', marginBottom: '0.4rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#64748b' }}>
                    <CalendarIcon />
                    {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#64748b' }}>
                    <MapPinIcon />
                    {item.location}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: '#64748b' }}>
                    <UserIcon />
                    {item.organizerName || item.organizerEmail || 'Organizador'}
                  </span>
                </div>

                <p style={{ margin: 0, fontSize: '0.73rem', color: '#94a3b8' }}>
                  Solicitado em {formatDate(item.approvalRequestedAt)}
                </p>
              </div>

              {/* Botões rápidos */}
              <div style={{
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                gap: '0.4rem', padding: '0.85rem 0.85rem 0.85rem 0',
                flexShrink: 0,
              }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  title="Aprovar publicação"
                  onClick={() => {
                    setSelectedEvent(item)
                  }}
                  style={{
                    width: 36, height: 36, borderRadius: '8px',
                    border: '1.5px solid #86efac', background: '#f0fdf4',
                    color: '#16a34a', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#dcfce7' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f0fdf4' }}
                >
                  <CheckIcon />
                </button>
                <button
                  type="button"
                  title="Ver detalhes e decidir"
                  onClick={() => setSelectedEvent(item)}
                  style={{
                    width: 36, height: 36, borderRadius: '8px',
                    border: '1.5px solid #e2e8f0', background: '#f8fafc',
                    color: '#475569', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 700,
                  }}
                >
                  ···
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal de revisão */}
      {selectedEvent && (
        <ReviewModal
          event={selectedEvent}
          onApprove={() => handleApprove(selectedEvent.id)}
          onReject={(reason) => handleReject(selectedEvent.id, reason)}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </section>
  )
}

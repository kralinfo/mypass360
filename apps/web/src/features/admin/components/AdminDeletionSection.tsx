'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { PendingDeletionEventItem } from '@mypass360/types'
import {
  fetchPendingDeletions,
  approveEventDeletion,
  rejectEventDeletion,
  contactEventOrganizer,
  fetchEventMessages,
  type EventMessageItem,
} from '../admin.service'
import { formatDate, formatCurrency } from '../admin.utils'

// ── Ícones SVG ─────────────────────────────────────────────────────────────
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

const MessageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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

// ── Modal de Análise da Solicitação de Exclusão ──────────────────────────────
interface DeletionReviewModalProps {
  event: PendingDeletionEventItem
  onApprove: () => Promise<void>
  onReject: (reason?: string) => Promise<void>
  onContact: (message: string) => Promise<void>
  onClose: () => void
}

function DeletionReviewModal({
  event,
  onApprove,
  onReject,
  onContact,
  onClose,
}: DeletionReviewModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | 'contact' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [contactMessage, setContactMessage] = useState(
    `Olá, recebemos sua solicitação de exclusão para o evento "${event.title}". Poderia nos informar mais detalhes sobre o motivo?`
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [messages, setMessages] = useState<EventMessageItem[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)

  const loadMessages = useCallback(async () => {
    try {
      const data = await fetchEventMessages(event.id)
      setMessages(data)
    } catch {
      // Ignora erro
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
      setError(err instanceof Error ? err.message : 'Erro ao aprovar exclusão.')
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
      setError(err instanceof Error ? err.message : 'Erro ao rejeitar solicitação.')
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
      await onContact(contactMessage.trim())
      setSuccessMsg('Mensagem enviada ao organizador com sucesso via notificação!')
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
        .del-review-overlay {
          position: fixed; inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          z-index: 9998;
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
          animation: fadeIn 0.15s ease;
        }
        .del-review-modal {
          background: #fff;
          border-radius: 20px;
          width: 100%;
          max-width: 660px;
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

      <div className="del-review-overlay" onClick={(e) => e.target === e.currentTarget && !isLoading && onClose()}>
        <div className="del-review-modal">

          {/* Header (Fixo no topo) */}
          <div style={{
            background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
            padding: '1.25rem 1.5rem',
            color: '#fff',
            borderRadius: '20px 20px 0 0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>
            <div>
              <p style={{ margin: '0 0 0.2rem', fontSize: '0.72rem', color: '#fca5a5', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                ANÁLISE DE SOLICITAÇÃO DE EXCLUSÃO
              </p>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.3 }}>
                {event.title}
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

            {/* ── MOTIVO DA SOLICITAÇÃO DE EXCLUSÃO (DESTAQUE) ── */}
            <div style={{
              background: '#fef2f2', border: '1.5px solid #fca5a5',
              borderRadius: '12px', padding: '1rem',
              marginBottom: '1.25rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.1rem' }}>💬</span>
                <strong style={{ fontSize: '0.82rem', color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Motivo da Solicitação (Informado pelo Organizador)
                </strong>
              </div>
              <p style={{
                margin: 0, fontSize: '0.92rem', color: '#7f1d1d', fontWeight: 600,
                lineHeight: 1.5, whiteSpace: 'pre-wrap',
              }}>
                &quot;{event.deletionReason}&quot;
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.74rem', color: '#991b1b' }}>
                Solicitado em {formatDate(event.deletionRequestedAt)} por <strong>{event.organizerName || event.organizerEmail || 'Organizador'}</strong>
              </p>
            </div>

            {/* ── MÉTRICAS COMERCIAIS & DE IMPACTO ── */}
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Impacto Comercial & Histórico de Vendas
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                <StatCard label="Ingressos Emitidos" value={event.totalAttendees.toString()} color="#1e293b" />
                <StatCard label="Pedidos Pagos" value={event.paidOrders.toString()} color="#059669" />
                <StatCard label="Total Pedidos" value={event.totalOrders.toString()} color="#4f46e5" />
                <StatCard label="Receita Bruta" value={formatCurrency(event.revenue)} color="#059669" />
              </div>

              {event.paidOrders > 0 && (
                <div style={{
                  marginTop: '0.5rem', background: '#fffbeb', border: '1px solid #fde68a',
                  borderRadius: '8px', padding: '0.5rem 0.75rem',
                  fontSize: '0.78rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.35rem',
                }}>
                  <span>⚠️</span>
                  <span>Este evento já possui <strong>{event.paidOrders} pedido(s) pago(s)</strong>. Ao aprovar, o evento será desativado/arquivado com segurança preservando o histórico financeiro.</span>
                </div>
              )}
            </div>

            {/* ── INFORMAÇÕES GERAIS DO EVENTO ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '1.25rem' }}>
              <InfoItem icon={<CalendarIcon />} label="Data" value={formattedEventDate} />
              <InfoItem icon={<MapPinIcon />} label="Local" value={event.location} />
              <InfoItem icon={<UserIcon />} label="Organizador" value={`${event.organizerName ?? 'Sem nome'} (${event.organizerEmail ?? 'Sem e-mail'})`} />
              <InfoItem icon={<TicketIcon />} label="Preço base" value={event.price === 0 ? 'Gratuito' : formatCurrency(event.price)} />
            </div>

            {/* Descrição */}
            {event.description && (
              <div style={{ marginBottom: '1.25rem' }}>
                <p style={{ margin: '0 0 0.35rem', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Descrição
                </p>
                <p style={{
                  margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: 1.5,
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  borderRadius: '8px', padding: '0.75rem', maxHeight: '100px', overflowY: 'auto',
                }}>
                  {event.description}
                </p>
              </div>
            )}

            {/* ── HISTÓRICO DE DIÁLOGO / CONVERSA COM O ORGANIZADOR ── */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  💬 Histórico de Diálogo com o Organizador ({messages.length})
                </p>
                <button type="button" onClick={() => void loadMessages()} style={{ background: 'none', border: 'none', color: '#4f46e5', fontSize: '0.74rem', cursor: 'pointer', fontWeight: 600 }}>
                  ↻ Atualizar conversa
                </button>
              </div>

              {isLoadingMessages ? (
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>Carregando diálogo...</p>
              ) : messages.length === 0 ? (
                <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
                  Nenhuma mensagem trocada ainda. Clique em &quot;Entrar em contato&quot; abaixo para enviar uma mensagem.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '220px', overflowY: 'auto', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.85rem' }}>
                  {messages.map((m) => {
                    const isAdmin = m.sender === 'admin'
                    return (
                      <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isAdmin ? 'flex-end' : 'flex-start' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: isAdmin ? '#4f46e5' : '#059669', marginBottom: '0.15rem' }}>
                          {isAdmin ? '🛡️ Administração' : `👤 ${event.organizerName || 'Organizador'}`}
                        </div>
                        <div style={{
                          background: isAdmin ? '#eef2ff' : '#ffffff',
                          border: isAdmin ? '1px solid #c7d2fe' : '1px solid #cbd5e1',
                          borderRadius: '10px', padding: '0.6rem 0.85rem', maxWidth: '85%',
                          fontSize: '0.84rem', color: '#1e293b', lineHeight: 1.45,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        }}>
                          {m.message}
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                          {formatDate(m.createdAt)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Success message */}
            {successMsg && (
              <div style={{
                background: '#f0fdf4', border: '1px solid #86efac',
                borderRadius: '8px', padding: '0.75rem 1rem',
                color: '#15803d', fontSize: '0.85rem', fontWeight: 600,
                marginBottom: '1rem',
              }}>
                ✅ {successMsg}
              </div>
            )}

            {/* ── AÇÕES ADMINISTRATIVAS (3 OPÇÕES) ── */}
            {action === null && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setAction('contact')}
                  style={{
                    flex: 1, padding: '0.7rem', borderRadius: '10px',
                    border: '1.5px solid #cbd5e1', background: '#ffffff',
                    color: '#475569', fontWeight: 700, fontSize: '0.84rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                  }}
                >
                  <MessageIcon />
                  Entrar em contato
                </button>

                <button
                  type="button"
                  onClick={() => setAction('reject')}
                  style={{
                    flex: 1, padding: '0.7rem', borderRadius: '10px',
                    border: '1.5px solid #bbf7d0', background: '#f0fdf4',
                    color: '#15803d', fontWeight: 700, fontSize: '0.84rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                  }}
                >
                  <CheckIcon />
                  Rejeitar exclusão
                </button>

                <button
                  type="button"
                  onClick={() => setAction('approve')}
                  style={{
                    flex: 1, padding: '0.7rem', borderRadius: '10px',
                    border: 'none', background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                    color: '#ffffff', fontWeight: 700, fontSize: '0.84rem',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                  }}
                >
                  <XIcon />
                  Aprovar exclusão
                </button>
              </div>
            )}

            {/* Confirmação: Aprovar Exclusão */}
            {action === 'approve' && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '1rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 700, color: '#991b1b' }}>
                  🗑️ Confirmar aprovação de exclusão?
                </p>
                <p style={{ margin: '0 0 0.85rem', fontSize: '0.82rem', color: '#7f1d1d', lineHeight: 1.5 }}>
                  O evento será <strong>arquivado/desativado de forma segura</strong> no banco de dados. Ele deixará de ficar visível ao público e o organizador receberá uma notificação em tempo real.
                </p>
                {error && <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: '#dc2626' }}>{error}</p>}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={() => { setAction(null); setError(null) }} disabled={isLoading}
                    style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fff', color: '#991b1b', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                    Voltar
                  </button>
                  <button type="button" onClick={handleApprove} disabled={isLoading}
                    style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                    {isLoading ? 'Aprovando...' : 'Sim, aprovar exclusão'}
                  </button>
                </div>
              </div>
            )}

            {/* Confirmação: Rejeitar Exclusão */}
            {action === 'reject' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '1rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 700, color: '#15803d' }}>
                  🛡️ Rejeitar solicitação e manter evento ativo?
                </p>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: '#166534', lineHeight: 1.5 }}>
                  O evento voltará ao estado de publicação normal e o organizador será notificado.
                </p>
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#14532d', marginBottom: '0.35rem' }}>
                    Motivo da rejeição <span style={{ fontWeight: 400, color: '#64748b' }}>(opcional — enviado ao organizador)</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Ex: O evento possui ingressos vendidos ativos. Por favor, entre em contato com o suporte."
                    rows={3}
                    style={{
                      width: '100%', resize: 'vertical',
                      padding: '0.6rem 0.75rem', borderRadius: '8px',
                      border: '1px solid #86efac', background: '#fff',
                      fontSize: '0.83rem', color: '#1e293b',
                      fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                {error && <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: '#dc2626' }}>{error}</p>}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={() => { setAction(null); setError(null) }} disabled={isLoading}
                    style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #86efac', background: '#fff', color: '#15803d', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                    Voltar
                  </button>
                  <button type="button" onClick={handleReject} disabled={isLoading}
                    style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                    {isLoading ? 'Processando...' : 'Rejeitar solicitação'}
                  </button>
                </div>
              </div>
            )}

            {/* Ação: Entrar em contato */}
            {action === 'contact' && (
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                  💬 Enviar mensagem ao organizador
                </p>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
                  Escreva uma mensagem para o organizador. Ela será entregue em <strong>tempo real</strong> através da Central de Notificações dele.
                </p>
                <div style={{ marginBottom: '0.85rem' }}>
                  <textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    rows={4}
                    style={{
                      width: '100%', resize: 'vertical',
                      padding: '0.65rem 0.75rem', borderRadius: '8px',
                      border: '1px solid #cbd5e1', background: '#fff',
                      fontSize: '0.84rem', color: '#1e293b',
                      fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                {error && <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: '#dc2626' }}>{error}</p>}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={() => { setAction(null); setError(null) }} disabled={isLoading}
                    style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                    Voltar
                  </button>
                  <button type="button" onClick={handleContact} disabled={isLoading || !contactMessage.trim()}
                    style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                    {isLoading ? 'Enviando...' : 'Enviar mensagem'}
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

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem 0.6rem', textAlign: 'center' }}>
      <span style={{ display: 'block', fontSize: '0.66rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ display: 'block', fontSize: '0.92rem', fontWeight: 800, color, marginTop: '0.15rem' }}>{value}</span>
    </div>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem 0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
        <span style={{ color: '#94a3b8' }}>{icon}</span>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>{value}</p>
    </div>
  )
}

// ── COMPONENTE PRINCIPAL: AdminDeletionSection ─────────────────────────────
export function AdminDeletionSection() {
  const searchParams = useSearchParams()
  const targetEventId = searchParams.get('event_id')

  const [items, setItems] = useState<PendingDeletionEventItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<PendingDeletionEventItem | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchPendingDeletions()
      setItems(data)

      if (targetEventId) {
        const found = data.find((e) => e.id === targetEventId)
        if (found) setSelectedEvent(found)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar solicitações de exclusão.')
    } finally {
      setIsLoading(false)
    }
  }, [targetEventId])

  useEffect(() => { void load() }, [load])

  async function handleApprove(eventId: string) {
    await approveEventDeletion(eventId)
    await load()
  }

  async function handleReject(eventId: string, reason?: string) {
    await rejectEventDeletion(eventId, reason)
    await load()
  }

  async function handleContact(eventId: string, message: string) {
    await contactEventOrganizer(eventId, message)
  }

  return (
    <section>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          {!isLoading && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: items.length > 0 ? '#dc2626' : '#64748b',
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
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '12px', padding: '1rem 1.25rem', color: '#991b1b', marginBottom: '1rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Carregando */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1, 2].map((i) => (
            <div key={i} style={{ height: '100px', borderRadius: '14px', background: '#f1f5f9' }} />
          ))}
        </div>
      )}

      {/* Vazio */}
      {!isLoading && !error && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '16px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>
            Nenhuma solicitação de exclusão pendente
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
            Todos os eventos estão operando normalmente.
          </p>
        </div>
      )}

      {/* Lista */}
      {!isLoading && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map((item) => (
            <article
              key={item.id}
              style={{
                background: '#fff', border: '1px solid #fee2e2',
                borderRadius: '16px', overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                display: 'flex', flexDirection: 'row', cursor: 'pointer',
              }}
              onClick={() => setSelectedEvent(item)}
            >
              <div style={{ width: '100px', flexShrink: 0, background: 'linear-gradient(135deg, #7f1d1d, #991b1b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', color: '#fecaca' }}>
                {item.imageUrl ? <img src={item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🗑️'}
              </div>
              <div style={{ flex: 1, padding: '0.85rem 1rem', minWidth: 0 }}>
                <div style={{ marginBottom: '0.35rem' }}>
                  <span style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '999px', padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700 }}>
                    Exclusão solicitada
                  </span>
                </div>
                <h3 style={{ margin: '0 0 0.3rem', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                  {item.title}
                </h3>
                <p style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', color: '#7f1d1d', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Motivo: &quot;{item.deletionReason}&quot;
                </p>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
                  <span>Organizador: {item.organizerName || item.organizerEmail}</span>
                  <span>Vendas: {item.paidOrders} pedido(s) pago(s) ({formatCurrency(item.revenue)})</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal de Revisão */}
      {selectedEvent && (
        <DeletionReviewModal
          event={selectedEvent}
          onApprove={() => handleApprove(selectedEvent.id)}
          onReject={(reason) => handleReject(selectedEvent.id, reason)}
          onContact={(msg) => handleContact(selectedEvent.id, msg)}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </section>
  )
}

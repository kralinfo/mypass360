'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Event } from '@mypass360/types'
import {
  getEventDisplayStatus,
  canRequestApproval,
  canPublishEvent,
  canUnpublishEvent,
  requiresDeletionApproval,
} from '@mypass360/types'
import { createClient } from '@/lib/supabase/client'
import {
  publishEvent,
  unpublishEvent,
  scheduleEventPublication,
  deleteEvent,
  requestEventApproval,
  requestEventDeletion,
} from '../services/my-events.service'
import { ScheduleModal } from './ScheduleModal'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import { PublishRequestModal } from './PublishRequestModal'
import { DeleteRequestModal } from './DeleteRequestModal'
import { AdminMessageDialogModal } from './AdminMessageDialogModal'
import { EventDetailsModal } from '@/features/admin/components/EventDetailsModal'

interface MyEventCardProps {
  event: Event
  onStatusChange: () => void
}

// ── Configuração visual de cada estado do ciclo de vida ──────────────────────
const STATUS_CONFIG = {
  published: {
    color: '#10b981',
    bg: 'rgba(240, 253, 244, 0.97)',
    border: '#86efac',
    label: 'Publicado',
    dot: '#10b981',
  },
  scheduled: {
    color: '#d97706',
    bg: 'rgba(254, 243, 199, 0.97)',
    border: '#fde68a',
    label: 'Agendado',
    dot: '#d97706',
  },
  draft: {
    color: '#64748b',
    bg: 'rgba(241, 245, 249, 0.97)',
    border: '#cbd5e1',
    label: 'Rascunho',
    dot: '#94a3b8',
  },
  pending_approval: {
    color: '#7c3aed',
    bg: 'rgba(245, 243, 255, 0.97)',
    border: '#c4b5fd',
    label: 'Aguardando aprovação',
    dot: '#8b5cf6',
  },
  approved: {
    color: '#059669',
    bg: 'rgba(236, 253, 245, 0.97)',
    border: '#6ee7b7',
    label: 'Aprovado ✓',
    dot: '#10b981',
  },
  rejected: {
    color: '#dc2626',
    bg: 'rgba(254, 242, 242, 0.97)',
    border: '#fca5a5',
    label: 'Reprovado',
    dot: '#ef4444',
  },
  deletion_pending: {
    color: '#dc2626',
    bg: 'rgba(254, 242, 242, 0.97)',
    border: '#fca5a5',
    label: 'Exclusão em análise ⏳',
    dot: '#ef4444',
  },
  deletion_approved: {
    color: '#64748b',
    bg: 'rgba(241, 245, 249, 0.97)',
    border: '#cbd5e1',
    label: 'Indisponível',
    dot: '#64748b',
  },
  hidden: {
    color: '#475569',
    bg: 'rgba(241, 245, 249, 0.97)',
    border: '#cbd5e1',
    label: 'Oculto',
    dot: '#94a3b8',
  },
} as const

// ── Ícones SVG ────────────────────────────────────────────────────────────────
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
)

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const MapPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const GearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

const RocketIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
)

const EyeOffIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

const PublishIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="10 15 15 12 10 9" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

// ── Componente principal ──────────────────────────────────────────────────────
export function MyEventCard({ event, onStatusChange }: MyEventCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [showPublishRequestModal, setShowPublishRequestModal] = useState(false)
  const [showDeleteRequestModal, setShowDeleteRequestModal] = useState(false)
  const [showAdminDialogModal, setShowAdminDialogModal] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)

  const displayStatus = getEventDisplayStatus(event)
  const statusConfig = STATUS_CONFIG[displayStatus]

  // Permissões calculadas a partir dos helpers centralizados
  const showRequestApproval = canRequestApproval(event)
  const showPublish = canPublishEvent(event)
  const showUnpublish = canUnpublishEvent(event)

  const formattedDate = new Date(event.date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const formattedScheduledAt =
    displayStatus === 'scheduled' && event.published_at
      ? new Date(event.published_at).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null

  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  async function getToken(): Promise<string | null> {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  async function handlePublish() {
    setLoading('publish')
    setError(null)
    setMenuOpen(false)
    try {
      const token = await getToken()
      if (!token) throw new Error('Sessão expirada. Faça login novamente.')
      await publishEvent(event.id, token)
      onStatusChange()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao publicar evento')
    } finally {
      setLoading(null)
    }
  }

  async function handleUnpublish() {
    setLoading('unpublish')
    setError(null)
    setMenuOpen(false)
    try {
      const token = await getToken()
      if (!token) throw new Error('Sessão expirada. Faça login novamente.')
      await unpublishEvent(event.id, token)
      onStatusChange()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao ocultar evento')
    } finally {
      setLoading(null)
    }
  }

  async function handleSchedule(publishedAt: string) {
    const token = await getToken()
    if (!token) throw new Error('Sessão expirada. Faça login novamente.')
    await scheduleEventPublication(event.id, token, publishedAt)
    onStatusChange()
  }

  async function handleRequestApproval() {
    const token = await getToken()
    if (!token) throw new Error('Sessão expirada. Faça login novamente.')
    await requestEventApproval(event.id, token)
    onStatusChange()
  }

  async function handleRequestDeletion(reason: string) {
    const token = await getToken()
    if (!token) throw new Error('Sessão expirada. Faça login novamente.')
    await requestEventDeletion(event.id, token, reason)
    onStatusChange()
  }

  async function handleSendAdminReply(replyMessage: string) {
    const token = await getToken()
    if (!token) throw new Error('Sessão expirada. Faça login novamente.')
    const { replyAdminMessage } = await import('../services/my-events.service')
    await replyAdminMessage(event.id, token, replyMessage)
  }

  async function handleDelete() {
    const token = await getToken()
    if (!token) throw new Error('Sessão expirada. Faça login novamente.')
    await deleteEvent(event.id, token)
    onStatusChange()
  }

  return (
    <>
      <style>{`
        .my-event-card {
          background: #ffffff;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .my-event-card:hover {
          box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04);
        }
        .my-event-btn-edit {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          padding: 0.45rem 0.75rem;
          height: 34px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          color: #1e293b;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .my-event-btn-edit:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }
        .my-event-btn-menu {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.45rem 0.65rem;
          width: 66px;
          height: 34px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          color: #334155;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .my-event-btn-menu:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }
        .my-event-dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.65rem;
          border: none;
          background: transparent;
          color: #334155;
          font-size: 0.8rem;
          font-weight: 600;
          border-radius: 6px;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s ease;
        }
        .my-event-dropdown-item:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .my-event-dropdown-item:disabled {
          opacity: 0.45;
          cursor: not-allowed !important;
          background: transparent !important;
          color: #94a3b8 !important;
        }
        .my-event-dropdown-item.danger {
          color: #dc2626;
        }
        .my-event-dropdown-item.danger:hover {
          background: #fef2f2;
          color: #b91c1c;
        }
        .my-event-dropdown-item.danger:disabled {
          color: #94a3b8 !important;
          background: transparent !important;
        }
      `}</style>

      <article className="my-event-card">
        {/* ── 1. IMAGEM / BANNER ── */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '160px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            overflow: 'hidden',
          }}
        >
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.2rem', color: '#94a3b8',
                background: 'linear-gradient(135deg, #312e81 0%, #4338ca 100%)',
              }}
            >
              🎟️
            </div>
          )}

          {/* Badge de Status */}
          <div
            style={{
              position: 'absolute', top: '10px', left: '10px',
              background: statusConfig.bg,
              color: statusConfig.color,
              border: `1px solid ${statusConfig.border}`,
              borderRadius: '999px',
              padding: '3px 9px',
              fontSize: '0.72rem',
              fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '5px',
              backdropFilter: 'blur(6px)',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
              zIndex: 2,
              maxWidth: 'calc(100% - 20px)',
            }}
          >
            <span
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: statusConfig.dot,
                display: 'inline-block', flexShrink: 0,
              }}
            />
            {statusConfig.label}
          </div>

          {/* Indicador de loading sobre a imagem */}
          {loading && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 3,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          )}
        </div>

        {/* ── 2. INFORMAÇÕES ── */}
        <div style={{ padding: '0.85rem 1rem 0.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <h2
            style={{
              margin: '0 0 0.4rem',
              fontSize: '1rem', color: '#0f172a',
              fontWeight: 700, lineHeight: 1.3,
              letterSpacing: '-0.01em',
            }}
          >
            {event.title}
          </h2>

          <div style={{ display: 'grid', gap: '0.25rem', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#64748b' }}>
              <span style={{ display: 'flex', color: '#94a3b8' }}><CalendarIcon /></span>
              <time dateTime={event.date}>{formattedDate}</time>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#64748b' }}>
              <span style={{ display: 'flex', color: '#94a3b8' }}><MapPinIcon /></span>
              <span>{event.location}</span>
            </div>
          </div>

          {/* Aviso de Agendamento */}
          {displayStatus === 'scheduled' && formattedScheduledAt && (
            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a',
              borderRadius: '8px', padding: '0.45rem 0.65rem',
              marginBottom: '0.5rem', fontSize: '0.74rem', color: '#b45309',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
            }}>
              <span style={{ display: 'flex', color: '#f59e0b' }}><ClockIcon /></span>
              <span>Será publicado em: <strong>{formattedScheduledAt}</strong></span>
            </div>
          )}

          {/* Aviso: Aguardando aprovação */}
          {displayStatus === 'pending_approval' && (
            <div style={{
              background: '#f5f3ff', border: '1px solid #c4b5fd',
              borderRadius: '8px', padding: '0.45rem 0.65rem',
              marginBottom: '0.5rem', fontSize: '0.74rem', color: '#6d28d9',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
            }}>
              <span>⏳</span>
              <span>Solicitação enviada — aguardando análise do administrador.</span>
            </div>
          )}

          {/* Aviso: Aprovado, pronto para publicar */}
          {displayStatus === 'approved' && (
            <div style={{
              background: '#ecfdf5', border: '1px solid #6ee7b7',
              borderRadius: '8px', padding: '0.45rem 0.65rem',
              marginBottom: '0.5rem', fontSize: '0.74rem', color: '#065f46',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
            }}>
              <span>✅</span>
              <span>Evento aprovado! Clique em <strong>Publicar</strong> para torná-lo público.</span>
            </div>
          )}

          {/* Aviso: Reprovado */}
          {displayStatus === 'rejected' && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5',
              borderRadius: '8px', padding: '0.45rem 0.65rem',
              marginBottom: '0.5rem', fontSize: '0.74rem', color: '#991b1b',
              display: 'flex', alignItems: 'flex-start', gap: '0.35rem',
            }}>
              <span style={{ flexShrink: 0 }}>❌</span>
              <span>
                Solicitação reprovada.{' '}
                {event.approval_rejection_reason
                  ? <>Motivo: <em>{event.approval_rejection_reason}</em>. </>
                  : ''}
                Você pode editar o evento e solicitar novamente.
              </span>
            </div>
          )}

          {/* Aviso: Exclusão em Análise (Clicável para ver diálogo) */}
          {displayStatus === 'deletion_pending' && (
            <div
              onClick={() => setShowAdminDialogModal(true)}
              style={{
                background: '#fef2f2', border: '1px solid #fca5a5',
                borderRadius: '8px', padding: '0.5rem 0.75rem',
                marginBottom: '0.5rem', fontSize: '0.74rem', color: '#991b1b',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Clique para ver a conversa e as mensagens com a administração"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>⏳</span>
                <span>Solicitação de exclusão enviada. Aguardando análise do administrador.</span>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textDecoration: 'underline', color: '#dc2626', flexShrink: 0 }}>
                Ver diálogo 💬
              </span>
            </div>
          )}

          {/* Aviso: Exclusão Aprovada pelo Admin */}
          {displayStatus === 'deletion_approved' && (
            <div style={{
              background: '#f8fafc', border: '1px solid #cbd5e1',
              borderRadius: '8px', padding: '0.45rem 0.65rem',
              marginBottom: '0.5rem', fontSize: '0.74rem', color: '#475569',
              display: 'flex', alignItems: 'center', gap: '0.35rem',
            }}>
              <span>🚫</span>
              <span>Este evento foi desativado/excluído e está permanentemente indisponível.</span>
            </div>
          )}

          {/* Feedback de erro */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5',
              borderRadius: '6px', padding: '0.4rem 0.6rem',
              marginBottom: '0.5rem', color: '#991b1b', fontSize: '0.75rem',
            }}>
              {error}
            </div>
          )}

          {/* ── 3. CONTROLES ── */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              paddingTop: '0.65rem', borderTop: '1px solid #f1f5f9',
              marginTop: 'auto', position: 'relative',
            }}
          >
            {/* Botão Editar */}
            <button
              type="button"
              className="my-event-btn-edit"
              onClick={() => router.push(`/eventos/cadastrar?edit=${event.id}`)}
              title="Editar informações do evento"
            >
              <EditIcon />
              <span>Editar</span>
            </button>

            {/* Menu de Ações (... ˅) */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="my-event-btn-menu"
                onClick={() => setMenuOpen((curr) => !curr)}
                title="Mais opções do evento"
                aria-expanded={menuOpen}
              >
                <span>•••</span>
                <span style={{ display: 'flex', transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                  <ChevronDownIcon />
                </span>
              </button>

              {/* ── DROPDOWN ── */}
              {menuOpen && (
                <div
                  style={{
                    position: 'absolute', right: 0, bottom: '100%',
                    marginBottom: '8px', width: '210px',
                    background: '#ffffff', borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                    padding: '6px', zIndex: 100,
                  }}
                >

                  {/* 1. Solicitar publicação — visível apenas quando aplicável */}
                  {showRequestApproval && (
                    <button
                      type="button"
                      className="my-event-dropdown-item"
                      onClick={() => {
                        setMenuOpen(false)
                        setShowPublishRequestModal(true)
                      }}
                      style={{ color: '#4f46e5' }}
                      title="Solicitar aprovação de publicação"
                    >
                      <span style={{ display: 'flex', color: '#4f46e5' }}><RocketIcon /></span>
                      <span>
                        {displayStatus === 'rejected' ? 'Solicitar novamente' : 'Solicitar publicação'}
                      </span>
                    </button>
                  )}

                  {/* Informativo: aguardando aprovação */}
                  {displayStatus === 'pending_approval' && (
                    <button
                      type="button"
                      className="my-event-dropdown-item"
                      disabled
                      title="Aguardando análise do administrador"
                    >
                      <span style={{ display: 'flex', color: '#8b5cf6' }}>⏳</span>
                      <span style={{ color: '#6d28d9' }}>Aguardando aprovação</span>
                    </button>
                  )}

                  {/* 2. Publicar — apenas quando aprovado */}
                  {showPublish && (
                    <button
                      type="button"
                      className="my-event-dropdown-item"
                      onClick={() => {
                        setMenuOpen(false)
                        void handlePublish()
                      }}
                      disabled={loading === 'publish'}
                      title="Publicar evento agora"
                      style={{ color: '#059669' }}
                    >
                      <span style={{ display: 'flex', color: '#059669' }}><PublishIcon /></span>
                      <span>{loading === 'publish' ? 'Publicando...' : 'Publicar'}</span>
                    </button>
                  )}

                  {/* 3. Ocultar — apenas quando publicado */}
                  {showUnpublish && (
                    <button
                      type="button"
                      className="my-event-dropdown-item"
                      onClick={() => {
                        setMenuOpen(false)
                        void handleUnpublish()
                      }}
                      disabled={loading === 'unpublish'}
                      title="Ocultar evento (voltar para rascunho)"
                    >
                      <span style={{ display: 'flex', color: '#64748b' }}><EyeOffIcon /></span>
                      <span>{loading === 'unpublish' ? 'Ocultando...' : 'Ocultar'}</span>
                    </button>
                  )}

                  {/* 4. Gerenciar */}
                  <button
                    type="button"
                    className="my-event-dropdown-item"
                    onClick={() => {
                      setMenuOpen(false)
                      setShowManageModal(true)
                    }}
                  >
                    <span style={{ display: 'flex', color: '#6366f1' }}><GearIcon /></span>
                    <span>Gerenciar</span>
                  </button>

                  {/* 4.5 Ver mensagens / diálogo */}
                  <button
                    type="button"
                    className="my-event-dropdown-item"
                    onClick={() => {
                      setMenuOpen(false)
                      setShowAdminDialogModal(true)
                    }}
                    title="Ver mensagens e diálogo com a administração"
                    style={{ color: '#4f46e5' }}
                  >
                    <span style={{ display: 'flex', color: '#4f46e5' }}>💬</span>
                    <span>Ver mensagens</span>
                  </button>

                  {/* 5. Agendar publicação — apenas quando aprovado e não publicado */}
                  {displayStatus === 'approved' && (
                    <button
                      type="button"
                      className="my-event-dropdown-item"
                      onClick={() => {
                        setMenuOpen(false)
                        setShowScheduleModal(true)
                      }}
                    >
                      <span style={{ display: 'flex', color: '#0ea5e9' }}><CalendarIcon /></span>
                      <span>Agendar publicação</span>
                    </button>
                  )}

                  {/* Divisória */}
                  <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />

                  {/* 6. Excluir / Solicitar exclusão */}
                  {requiresDeletionApproval(event) ? (
                    <button
                      type="button"
                      className="my-event-dropdown-item danger"
                      onClick={() => {
                        setMenuOpen(false)
                        setShowDeleteRequestModal(true)
                      }}
                      disabled={displayStatus === 'deletion_pending'}
                      title="Solicitar exclusão deste evento publicado ao administrador"
                    >
                      <span style={{ display: 'flex', color: '#ef4444' }}><TrashIcon /></span>
                      <span>
                        {displayStatus === 'deletion_pending' ? 'Exclusão em análise' : 'Solicitar exclusão'}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="my-event-dropdown-item danger"
                      onClick={() => {
                        setMenuOpen(false)
                        setShowDeleteModal(true)
                      }}
                      title="Excluir rascunho permanentemente"
                    >
                      <span style={{ display: 'flex', color: '#ef4444' }}><TrashIcon /></span>
                      <span>Excluir</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* Modal de Solicitação de Publicação */}
      {showPublishRequestModal && (
        <PublishRequestModal
          eventTitle={event.title}
          onConfirm={handleRequestApproval}
          onClose={() => setShowPublishRequestModal(false)}
        />
      )}

      {/* Modal de Agendamento */}
      {showScheduleModal && (
        <ScheduleModal
          eventTitle={event.title}
          onConfirm={handleSchedule}
          onClose={() => setShowScheduleModal(false)}
        />
      )}

      {/* Modal de Exclusão */}
      {showDeleteModal && (
        <DeleteConfirmModal
          eventTitle={event.title}
          onConfirm={handleDelete}
          onClose={() => setShowDeleteModal(false)}
        />
      )}

      {/* Modal de Gerenciamento */}
      {showManageModal && (
        <EventDetailsModal
          event={event}
          onClose={() => setShowManageModal(false)}
          onUpdated={onStatusChange}
        />
      )}

      {/* Modal de Solicitação de Exclusão */}
      {showDeleteRequestModal && (
        <DeleteRequestModal
          eventTitle={event.title}
          onConfirm={handleRequestDeletion}
          onClose={() => setShowDeleteRequestModal(false)}
        />
      )}

      {/* Modal de Diálogo com a Administração */}
      {showAdminDialogModal && (
        <AdminMessageDialogModal
          eventId={event.id}
          eventTitle={event.title}
          adminMessage="Clique para ver o histórico de mensagens trocadas com a administração."
          onSendReply={handleSendAdminReply}
          onClose={() => setShowAdminDialogModal(false)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

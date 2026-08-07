'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Event } from '@mypass360/types'
import { getEventDisplayStatus } from '@mypass360/types'
import { createClient } from '@/lib/supabase/client'
import { publishEvent, unpublishEvent, scheduleEventPublication, deleteEvent } from '../services/my-events.service'
import { ScheduleModal } from './ScheduleModal'
import { DeleteConfirmModal } from './DeleteConfirmModal'

interface MyEventCardProps {
  event: Event
  onStatusChange: () => void
}

const STATUS_CONFIG = {
  published: {
    color: '#10b981',
    bg: '#f0fdf4',
    border: '#a7f3d0',
    label: 'Publicado',
  },
  scheduled: {
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    label: 'Agendado',
  },
  hidden: {
    color: '#64748b',
    bg: '#f8fafc',
    border: '#e2e8f0',
    label: 'Oculto',
  },
} as const

// Ícones SVG Minimalistas e Modernos
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
)

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const MapPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
)

export function MyEventCard({ event, onStatusChange }: MyEventCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const displayStatus = getEventDisplayStatus(event)
  const statusConfig = STATUS_CONFIG[displayStatus]

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

  async function handleDelete() {
    const token = await getToken()
    if (!token) throw new Error('Sessão expirada. Faça login novamente.')
    await deleteEvent(event.id, token)
    onStatusChange()
  }

  // Estilo base do botão de ação unificado e minimalista
  const actionBtnStyle: React.CSSProperties = {
    padding: '0.5rem 0.6rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#334155',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
  }

  const deleteBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '0.75rem',
    left: '0.75rem',
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(226, 232, 240, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  }

  // Bolinha de status
  const dotStyle = (color: string): React.CSSProperties => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: color,
    display: 'inline-block',
  })

  return (
    <>
      <style>{`
        .my-event-btn-action {
          flex: 1;
          justify-content: center;
          min-width: 60px;
        }
        .my-event-delete-btn {
          border: none;
        }
        .my-event-btn-action:hover {
          background: #f1f5f9 !important;
          color: #0f172a !important;
          border-color: #cbd5e1 !important;
          transform: translateY(-1px);
        }
        .my-event-delete-btn:hover {
          background: #fee2e2 !important;
          color: #ef4444 !important;
          border-color: #fca5a5 !important;
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
        }
        @media (max-width: 480px) {
          .my-event-btn-action {
            font-size: 0.7rem !important;
            padding: 0.5rem 0.35rem !important;
          }
        }
      `}</style>
      <article
        style={{
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.02)',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #f1f5f9',
        }}
      >
        {/* Capa do evento */}
        <div
          style={{
            height: '140px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '2.5rem',
            position: 'relative',
          }}
        >
          🎵
          {/* Botão de Excluir Flutuante */}
          <button
            type="button"
            className="my-event-delete-btn"
            onClick={() => setShowDeleteModal(true)}
            style={deleteBtnStyle}
            title="Excluir evento"
          >
            <TrashIcon />
          </button>

          {/* Badge de status minimalista e moderna */}
          <span
            style={{
              position: 'absolute',
              top: '0.75rem',
              right: '0.75rem',
              background: statusConfig.bg,
              color: statusConfig.color,
              border: `1px solid ${statusConfig.border}`,
              borderRadius: '999px',
              padding: '0.3rem 0.8rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <span style={dotStyle(statusConfig.color)} />
            {statusConfig.label}
          </span>
        </div>

        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Título */}
          <h2
            style={{
              margin: '0 0 0.6rem',
              fontSize: '1.15rem',
              color: '#0f172a',
              fontWeight: 700,
              lineHeight: 1.35,
              letterSpacing: '-0.01em',
            }}
          >
            {event.title}
          </h2>

          {/* Infos com ícones modernos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
              <span style={{ display: 'flex', color: '#94a3b8' }}><CalendarIcon /></span>
              <time dateTime={event.date}>{formattedDate}</time>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
              <span style={{ display: 'flex', color: '#94a3b8' }}><MapPinIcon /></span>
              <span>{event.location}</span>
            </div>
          </div>

          {/* Info de agendamento */}
          {displayStatus === 'scheduled' && formattedScheduledAt && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                padding: '0.75rem 0.85rem',
                marginBottom: '1.25rem',
                fontSize: '0.8rem',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                lineHeight: 1.4,
              }}
            >
              <span style={{ display: 'flex', color: '#f59e0b' }}><ClockIcon /></span>
              <span>Será publicado em: <strong>{formattedScheduledAt}</strong></span>
            </div>
          )}

          {/* Erro local */}
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '0.5rem 0.75rem',
                marginBottom: '1rem',
                color: '#991b1b',
                fontSize: '0.8rem',
              }}
            >
              {error}
            </div>
          )}

          {/* Ações */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid #f1f5f9',
              marginTop: 'auto',
            }}
          >
            {/* Editar */}
            <button
              type="button"
              className="my-event-btn-action"
              onClick={() => router.push(`/eventos/cadastrar?edit=${event.id}`)}
              style={actionBtnStyle}
            >
              <EditIcon />
              <span>Editar</span>
            </button>

            {/* Publicar */}
            {displayStatus === 'hidden' && (
              <button
                type="button"
                className="my-event-btn-action"
                onClick={() => void handlePublish()}
                disabled={loading === 'publish'}
                style={actionBtnStyle}
              >
                <span style={dotStyle('#10b981')} />
                <span>{loading === 'publish' ? 'Publicando...' : 'Publicar'}</span>
              </button>
            )}

            {/* Ocultar */}
            {(displayStatus === 'published' || displayStatus === 'scheduled') && (
              <button
                type="button"
                className="my-event-btn-action"
                onClick={() => void handleUnpublish()}
                disabled={loading === 'unpublish'}
                style={actionBtnStyle}
              >
                <span style={dotStyle('#ef4444')} />
                <span>{loading === 'unpublish' ? 'Ocultando...' : 'Ocultar'}</span>
              </button>
            )}

            {/* Agendar */}
            {displayStatus === 'hidden' && (
              <button
                type="button"
                className="my-event-btn-action"
                onClick={() => setShowScheduleModal(true)}
                style={actionBtnStyle}
              >
                <CalendarIcon />
                <span>Agendar</span>
              </button>
            )}
          </div>
        </div>
      </article>

      {showScheduleModal && (
        <ScheduleModal
          eventTitle={event.title}
          onConfirm={handleSchedule}
          onClose={() => setShowScheduleModal(false)}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          eventTitle={event.title}
          onConfirm={handleDelete}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </>
  )
}

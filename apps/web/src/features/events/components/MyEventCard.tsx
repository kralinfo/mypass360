'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Event } from '@mypass360/types'
import { getEventDisplayStatus } from '@mypass360/types'
import { createClient } from '@/lib/supabase/client'
import { publishEvent, unpublishEvent, scheduleEventPublication, deleteEvent } from '../services/my-events.service'
import { ScheduleModal } from './ScheduleModal'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import { EventDetailsModal } from '@/features/admin/components/EventDetailsModal'

interface MyEventCardProps {
  event: Event
  onStatusChange: () => void
}

const STATUS_CONFIG = {
  published: {
    color: '#10b981',
    bg: 'rgba(240, 253, 244, 0.95)',
    border: '#86efac',
    label: 'Publicado',
  },
  scheduled: {
    color: '#d97706',
    bg: 'rgba(254, 243, 199, 0.95)',
    border: '#fde68a',
    label: 'Agendado',
  },
  hidden: {
    color: '#475569',
    bg: 'rgba(241, 245, 249, 0.95)',
    border: '#cbd5e1',
    label: 'Oculto',
  },
} as const

// Ícones SVG Minimalistas
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

const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

export function MyEventCard({ event, onStatusChange }: MyEventCardProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)

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
        .my-event-dropdown-item.danger {
          color: #dc2626;
        }
        .my-event-dropdown-item.danger:hover {
          background: #fef2f2;
          color: #b91c1c;
        }
      `}</style>

      <article className="my-event-card">
        {/* ── 1. ÁREA SUPERIOR — IMAGEM / BANNER DO EVENTO ── */}
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
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.2rem',
                color: '#94a3b8',
                background: 'linear-gradient(135deg, #312e81 0%, #4338ca 100%)',
              }}
            >
              🎟️
            </div>
          )}

          {/* Badge de Status flutuante no canto superior esquerdo */}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: statusConfig.bg,
              color: statusConfig.color,
              border: `1px solid ${statusConfig.border}`,
              borderRadius: '999px',
              padding: '3px 9px',
              fontSize: '0.72rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              backdropFilter: 'blur(6px)',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
              zIndex: 2,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: statusConfig.color,
                display: 'inline-block',
              }}
            />
            {statusConfig.label}
          </div>
        </div>

        {/* ── 2. ÁREA INFERIOR — INFORMAÇÕES COMPACTAS ── */}
        <div style={{ padding: '0.85rem 1rem 0.75rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Título com destaque */}
          <h2
            style={{
              margin: '0 0 0.4rem',
              fontSize: '1rem',
              color: '#0f172a',
              fontWeight: 700,
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
            }}
          >
            {event.title}
          </h2>

          {/* Informações: Data e Localização */}
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
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '0.45rem 0.65rem',
                marginBottom: '0.5rem',
                fontSize: '0.74rem',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span style={{ display: 'flex', color: '#f59e0b' }}><ClockIcon /></span>
              <span>Será publicado em: <strong>{formattedScheduledAt}</strong></span>
            </div>
          )}

          {/* Feedback de erro */}
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                padding: '0.4rem 0.6rem',
                marginBottom: '0.5rem',
                color: '#991b1b',
                fontSize: '0.75rem',
              }}
            >
              {error}
            </div>
          )}

          {/* ── 3. CONTROLES INFERIORES: EDITAR + MENU DE AÇÕES (... ˅) ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              paddingTop: '0.65rem',
              borderTop: '1px solid #f1f5f9',
              marginTop: 'auto',
              position: 'relative',
            }}
          >
            {/* Botão 1 — Editar */}
            <button
              type="button"
              className="my-event-btn-edit"
              onClick={() => router.push(`/eventos/cadastrar?edit=${event.id}`)}
              title="Editar informações do evento"
            >
              <EditIcon />
              <span>Editar</span>
            </button>

            {/* Botão 2 — Menu de Ações (... ˅) */}
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

              {/* ── 4. DROPDOWN DE AÇÕES ── */}
              {menuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    bottom: '100%',
                    marginBottom: '8px',
                    width: '200px',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                    padding: '6px',
                    zIndex: 100,
                  }}
                >
                  {/* Publicar / Ocultar */}
                  {displayStatus === 'hidden' ? (
                    <button
                      type="button"
                      className="my-event-dropdown-item"
                      onClick={() => void handlePublish()}
                      disabled={loading === 'publish'}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                      <span>{loading === 'publish' ? 'Publicando...' : 'Publicar'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="my-event-dropdown-item"
                      onClick={() => void handleUnpublish()}
                      disabled={loading === 'unpublish'}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
                      <span>{loading === 'unpublish' ? 'Ocultando...' : 'Ocultar'}</span>
                    </button>
                  )}

                  {/* Agendar Publicação */}
                  {displayStatus === 'hidden' && (
                    <button
                      type="button"
                      className="my-event-dropdown-item"
                      onClick={() => {
                        setMenuOpen(false)
                        setShowScheduleModal(true)
                      }}
                    >
                      <span style={{ display: 'flex', color: '#f59e0b' }}><CalendarIcon /></span>
                      <span>Agendar publicação</span>
                    </button>
                  )}

                  {/* Gerenciar (Abre EventDetailsModal) */}
                  <button
                    type="button"
                    className="my-event-dropdown-item"
                    onClick={() => {
                      setMenuOpen(false)
                      setShowManageModal(true)
                    }}
                  >
                    <span style={{ display: 'flex', color: '#4f46e5' }}><GearIcon /></span>
                    <span>Gerenciar</span>
                  </button>

                  {/* Divisória */}
                  <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />

                  {/* Excluir (Destrutivo) */}
                  <button
                    type="button"
                    className="my-event-dropdown-item danger"
                    onClick={() => {
                      setMenuOpen(false)
                      setShowDeleteModal(true)
                    }}
                  >
                    <span style={{ display: 'flex', color: '#dc2626' }}><TrashIcon /></span>
                    <span>Excluir</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>

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

      {/* Modal de Gerenciamento do Evento (Reutilizado do Admin) */}
      {showManageModal && (
        <EventDetailsModal
          event={event}
          onClose={() => setShowManageModal(false)}
          onUpdated={onStatusChange}
        />
      )}
    </>
  )
}

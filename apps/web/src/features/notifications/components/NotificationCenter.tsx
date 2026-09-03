'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Notification, NotificationType } from '@mypass360/types'
import { useNotifications } from '../useNotifications'

// ── Formatação de data relativa ─────────────────────────────────────────────
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Agora mesmo'
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `Há ${minutes} min`
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `Há ${hours} h`
  }
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Ícones por Tipo de Notificação ──────────────────────────────────────────
function NotificationIcon({ type }: { type: NotificationType }) {
  switch (type) {
    case 'event_approval_requested':
      return <span style={{ fontSize: '1.1rem' }}>🚀</span>
    case 'event_approved':
      return <span style={{ fontSize: '1.1rem' }}>✅</span>
    case 'event_rejected':
      return <span style={{ fontSize: '1.1rem' }}>❌</span>
    case 'event_published':
      return <span style={{ fontSize: '1.1rem' }}>🎉</span>
    case 'order_paid':
      return <span style={{ fontSize: '1.1rem' }}>💰</span>
    case 'checkin_completed':
      return <span style={{ fontSize: '1.1rem' }}>🎟️</span>
    default:
      return <span style={{ fontSize: '1.1rem' }}>🔔</span>
  }
}

// ── Componente Principal ───────────────────────────────────────────────────
export function NotificationCenter() {
  const router = useRouter()
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, clearAll } =
    useNotifications()

  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const popoverRef = useRef<HTMLDivElement>(null)

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const filteredNotifications = notifications.filter((n) => (filter === 'unread' ? !n.read : true))

  function handleNotificationClick(n: Notification) {
    if (!n.read) {
      void markAsRead(n.id)
    }
    setIsOpen(false)

    if (n.action_url) {
      const isCurrentlyOnAdminPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
      if (n.action_url.startsWith('/admin') && !isCurrentlyOnAdminPage) {
        const targetUrl = n.entity_id ? `/meus-eventos?event_id=${n.entity_id}` : '/meus-eventos'
        router.push(targetUrl)
      } else {
        router.push(n.action_url)
      }
    }
  }

  return (
    <div ref={popoverRef} style={{ position: 'relative', display: 'inline-block' }}>
      <style>{`
        .notif-bell-btn {
          position: relative;
          background: transparent;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 0.4rem;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease;
        }
        .notif-bell-btn:hover {
          background: rgba(148, 163, 184, 0.12);
        }
        .notif-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          background: #ef4444;
          color: #ffffff;
          font-size: 0.65rem;
          font-weight: 800;
          min-width: 17px;
          height: 17px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          box-shadow: 0 0 0 2px #fff;
          animation: pulseBadge 2s infinite;
        }
        @keyframes pulseBadge {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .notif-popover {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          width: 380px;
          max-width: calc(100vw - 24px);
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.18), 0 0 1px rgba(0, 0, 0, 0.1);
          z-index: 9999;
          overflow: hidden;
          animation: popoverSlide 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes popoverSlide {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .notif-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          transition: background 0.15s ease;
          position: relative;
        }
        .notif-item:hover {
          background: #f8fafc;
        }
        .notif-item.unread {
          background: #f0fdf4;
        }
        .notif-item.unread:hover {
          background: #dcfce7;
        }
      `}</style>

      {/* ── BOTÃO SINO DE NOTIFICAÇÃO ── */}
      <button
        type="button"
        className="notif-bell-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Notificações"
        aria-label="Abrir central de notificações"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* ── POPOVER DROPDOWN ── */}
      {isOpen && (
        <div className="notif-popover">
          {/* Header */}
          <div
            style={{
              padding: '0.85rem 1rem 0.65rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#fafafa',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                Notificações
              </h3>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: '999px',
                    padding: '1px 7px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                  }}
                >
                  {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void markAllAsRead()}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#4f46e5',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Marcar lidas
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={() => void clearAll()}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#dc2626',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  title="Excluir todas as notificações"
                >
                  Limpar todas 🗑️
                </button>
              )}
            </div>
          </div>

          {/* Filtros: Todas / Não Lidas */}
          <div
            style={{
              display: 'flex',
              padding: '0.4rem 0.65rem',
              gap: '0.35rem',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={() => setFilter('all')}
              style={{
                flex: 1,
                padding: '0.3rem 0.6rem',
                borderRadius: '8px',
                border: 'none',
                background: filter === 'all' ? '#ffffff' : 'transparent',
                color: filter === 'all' ? '#0f172a' : '#64748b',
                fontWeight: filter === 'all' ? 700 : 600,
                fontSize: '0.76rem',
                boxShadow: filter === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
              }}
            >
              Todas ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              style={{
                flex: 1,
                padding: '0.3rem 0.6rem',
                borderRadius: '8px',
                border: 'none',
                background: filter === 'unread' ? '#ffffff' : 'transparent',
                color: filter === 'unread' ? '#0f172a' : '#64748b',
                fontWeight: filter === 'unread' ? 700 : 600,
                fontSize: '0.76rem',
                boxShadow: filter === 'unread' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer',
              }}
            >
              Não lidas ({unreadCount})
            </button>
          </div>

          {/* Lista de Notificações */}
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {isLoading && notifications.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                Carregando notificações...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#94a3b8' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>🔕</div>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                  {filter === 'unread' ? 'Nenhuma notificação não lida' : 'Você não possui notificações'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div style={{ marginTop: '0.1rem', flexShrink: 0 }}>
                    <NotificationIcon type={n.type} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                        {n.title}
                      </h4>
                      <time style={{ fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {formatRelativeTime(n.created_at)}
                      </time>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
                      {n.message}
                    </p>
                  </div>
                  {!n.read && (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: '#22c55e',
                        flexShrink: 0,
                        alignSelf: 'center',
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

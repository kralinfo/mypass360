'use client'

import { useEffect, useState } from 'react'

import type { AdminDashboardData, AdminEventItem, EventStatus } from '@mypass360/types'
import { AdminPanelCard } from './AdminPanelCard'
import { AttendeesModal } from './AttendeesModal'
import { EventDetailsModal } from './EventDetailsModal'
import { AdminDeleteConfirmModal } from './AdminDeleteConfirmModal'
import { AdminEditEventModal } from './AdminEditEventModal'
import { eventStatusOptions, eventStatusLabels, getEventStatusLabel, formatCurrency, formatDate, statusColor } from '../admin.utils'

type AdminEventsSectionProps = {
  dashboard: AdminDashboardData | null
  isLoading: boolean
  runningAction: string | null
  onChangeStatus: (event: AdminEventItem, status: EventStatus) => Promise<void>
  onDelete: (event: AdminEventItem, reason?: string) => Promise<void>
  onSendReminders: (event: AdminEventItem) => void
  onRefresh?: () => void
}

const TH: React.CSSProperties = {
  padding: '0 14px 10px',
  textAlign: 'left',
  color: '#64748b',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '2px solid #e2e8f0',
  whiteSpace: 'nowrap',
}

const TD: React.CSSProperties = {
  padding: '11px 14px',
  verticalAlign: 'middle',
  borderBottom: '1px solid #f1f5f9',
}

// Ícones SVG minimalistas padrão
const IconUsers = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
)
const IconBell = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
)
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
)
const IconDots = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /><circle cx="5" cy="12" r="1.5" /></svg>
)

const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
)

export function AdminEventsSection({ dashboard, isLoading, runningAction, onChangeStatus, onDelete, onSendReminders, onRefresh }: AdminEventsSectionProps) {
  const [detailsEvent, setDetailsEvent] = useState<AdminEventItem | null>(null)
  const [attendeesEvent, setAttendeesEvent] = useState<AdminEventItem | null>(null)
  const [eventToDelete, setEventToDelete] = useState<AdminEventItem | null>(null)
  const [editEvent, setEditEvent] = useState<AdminEventItem | null>(null)
  const [openMenuEventId, setOpenMenuEventId] = useState<string | null>(null)

  // Filtros e Ordenação Admin
  const [search, setSearch] = useState('')
  const [periodTab, setPeriodTab] = useState<'all' | 'upcoming' | 'past'>('all')
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | 'paid' | 'free'>('all')
  const [sortBy, setSortBy] = useState<'date-asc' | 'date-desc' | 'revenue-desc' | 'orders-desc' | 'title-asc'>('date-asc')

  // Fechar o menu de ações ao clicar fora
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-actions-menu]')) {
        setOpenMenuEventId(null)
      }
    }
    document.addEventListener('click', handleGlobalClick)
    return () => document.removeEventListener('click', handleGlobalClick)
  }, [])

  const now = Date.now()
  const allEvents = dashboard?.events ?? []

  const filteredEvents = allEvents.filter((ev) => {
    const evTime = ev.date ? new Date(ev.date).getTime() : 0
    const isPast = ev.status === 'finished' || (evTime > 0 && evTime < now)

    if (periodTab === 'upcoming' && isPast) return false
    if (periodTab === 'past' && !isPast) return false

    const isFree = (ev as any).event_type === 'FREE' || ev.price === 0
    if (eventTypeFilter === 'free' && !isFree) return false
    if (eventTypeFilter === 'paid' && isFree) return false

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      const titleMatch = ev.title?.toLowerCase().includes(q)
      const locationMatch = ev.location?.toLowerCase().includes(q)
      const creatorMatch =
        (ev as any).organizer_name?.toLowerCase().includes(q) ||
        (ev as any).organizer_email?.toLowerCase().includes(q) ||
        (ev as any).organizer?.email?.toLowerCase().includes(q) ||
        (ev as any).organizer?.full_name?.toLowerCase().includes(q)
      if (!titleMatch && !locationMatch && !creatorMatch) return false
    }

    return true
  })

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0
    const bTime = b.date ? new Date(b.date).getTime() : 0
    const aRev = (a as any).totalRevenue ?? (a as any).revenue ?? 0
    const bRev = (b as any).totalRevenue ?? (b as any).revenue ?? 0
    const aOrders = a.totalOrders ?? 0
    const bOrders = b.totalOrders ?? 0

    switch (sortBy) {
      case 'date-asc':
        return aTime - bTime
      case 'date-desc':
        return bTime - aTime
      case 'revenue-desc':
        return bRev - aRev
      case 'orders-desc':
        return bOrders - aOrders
      case 'title-asc':
        return (a.title ?? '').localeCompare(b.title ?? '')
      default:
        return 0
    }
  })

  return (
    <>
      <AdminPanelCard title="Operação de eventos" subtitle="Clique em qualquer evento para gerenciar detalhes, acessos de portaria e check-ins.">
        {isLoading && !dashboard ? <p style={{ color: '#64748b' }}>Carregando eventos...</p> : null}
        {dashboard?.events.length === 0 ? <p style={{ color: '#64748b' }}>Nenhum evento encontrado.</p> : null}

        {/* Painel de Controles Admin: Filtros, Período, Tipo e Ordenação */}
        {dashboard?.events && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
            {/* Linha 1: Abas de Período + Filtro Pago/Gratuito */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.35rem', background: '#f1f5f9', padding: '3px', borderRadius: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPeriodTab('all')}
                  style={{
                    padding: '0.4rem 0.9rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: periodTab === 'all' ? '#1e293b' : 'transparent',
                    color: periodTab === 'all' ? '#fff' : '#64748b',
                    fontWeight: periodTab === 'all' ? 700 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  🌐 Todos ({allEvents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodTab('upcoming')}
                  style={{
                    padding: '0.4rem 0.9rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: periodTab === 'upcoming' ? '#1e293b' : 'transparent',
                    color: periodTab === 'upcoming' ? '#fff' : '#64748b',
                    fontWeight: periodTab === 'upcoming' ? 700 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  📅 Próximos / Ativos
                </button>
                <button
                  type="button"
                  onClick={() => setPeriodTab('past')}
                  style={{
                    padding: '0.4rem 0.9rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: periodTab === 'past' ? '#1e293b' : 'transparent',
                    color: periodTab === 'past' ? '#fff' : '#64748b',
                    fontWeight: periodTab === 'past' ? 700 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  📜 Encerrados / Passados
                </button>
              </div>

              {/* Toggle Pago vs Gratuito */}
              <div style={{ display: 'flex', gap: '0.3rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '3px', borderRadius: '9px' }}>
                {(['all', 'paid', 'free'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEventTypeFilter(t)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: '7px',
                      border: 'none',
                      background: eventTypeFilter === t ? '#6366f1' : 'transparent',
                      color: eventTypeFilter === t ? '#fff' : '#64748b',
                      fontWeight: eventTypeFilter === t ? 700 : 500,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    {t === 'all' ? 'Todos' : t === 'paid' ? '💳 Pagos' : '🎟️ Gratuitos'}
                  </button>
                ))}
              </div>
            </div>

            {/* Linha 2: Busca por texto + Seletor de Ordenação */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Buscar por evento, local ou criador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  flex: '1 1 240px',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  background: '#fff',
                  color: '#0f172a',
                }}
              />

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                style={{
                  flex: '0 0 auto',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#334155',
                  background: '#fff',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="date-asc">📅 Data: Próximos primeiro</option>
                <option value="date-desc">📅 Data: Mais distantes</option>
                <option value="revenue-desc">💰 Maior Receita</option>
                <option value="orders-desc">🛒 Mais Pedidos</option>
                <option value="title-asc">🔤 Título (A-Z)</option>
              </select>
            </div>
          </div>
        )}

        {dashboard?.events.length ? (
          <div style={{ overflowX: 'visible' }}>
            {sortedEvents.length === 0 ? (
              <p style={{ color: '#64748b', padding: '1rem 0' }}>Nenhum evento corresponde aos filtros selecionados.</p>
            ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}>Evento</th>
                  <th style={TH}>Criador</th>
                  <th style={TH}>Data / Local</th>
                  <th style={TH}>Status</th>
                  <th style={{ ...TH, textAlign: 'center' }}>Pedidos</th>
                  <th style={{ ...TH, textAlign: 'center' }}>Pagos</th>
                  <th style={TH}>Receita</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedEvents.map((event, index) => {
                  const isActionLoading = runningAction?.includes(event.id)
                  const pendingCount = event.totalOrders - event.paidOrders
                  const isMenuOpen = openMenuEventId === event.id
                  const isBottomRow = index >= dashboard.events.length - 2 || (dashboard.events.length <= 3 && index >= 1)

                  return (
                    <tr
                      key={event.id}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fafbff' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                    >
                      <td style={TD}>
                        <div
                          onClick={() => setDetailsEvent(event)}
                          title="Clique para abrir a gestão do evento"
                          style={{
                            cursor: 'pointer',
                            display: 'inline-block',
                          }}
                        >
                          <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.9rem', lineHeight: 1.3 }}>
                            {event.title}
                          </strong>
                        </div>
                      </td>

                      <td style={TD}>
                        <span style={{ display: 'block', color: '#0f172a', fontWeight: 600, fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                          {event.organizerName || 'Organizador'}
                        </span>
                        {event.organizerEmail && (
                          <span style={{
                            display: 'block', color: '#64748b', fontSize: '0.76rem', marginTop: '2px',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px',
                          }}>
                            {event.organizerEmail}
                          </span>
                        )}
                      </td>

                      <td style={TD}>
                        <span style={{ display: 'block', color: '#334155', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                          {formatDate(event.date)}
                        </span>
                        <span style={{
                          display: 'block', color: '#94a3b8', fontSize: '0.76rem', marginTop: '2px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {event.location}
                        </span>
                      </td>

                      <td style={TD}>
                        <span style={{
                          display: 'inline-flex', padding: '3px 9px', borderRadius: '999px',
                          background: `${statusColor(event.status)}1a`, color: statusColor(event.status),
                          fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', whiteSpace: 'nowrap',
                        }}>
                          {getEventStatusLabel(event.status)}
                        </span>
                      </td>

                      <td style={{ ...TD, textAlign: 'center', color: '#0f172a', fontWeight: 700 }}>{event.totalOrders}</td>
                      <td style={{ ...TD, textAlign: 'center', color: '#0f172a', fontWeight: 700 }}>{event.paidOrders}</td>
                      <td style={{ ...TD, color: '#0f172a', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatCurrency(event.revenue)}</td>

                      <td style={{ ...TD, textAlign: 'right' }}>
                        <div data-actions-menu style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* Botão Principal: Gerenciar */}
                          <button
                            type="button"
                            onClick={() => setDetailsEvent(event)}
                            title="Abrir Gestão e Check-in do Evento"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              border: '1px solid #c7d2fe',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              background: '#eef2ff',
                              color: '#4338ca',
                              fontWeight: 600,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'all 0.15s',
                            }}
                          >
                            Gerenciar
                          </button>

                          {/* Botão de Menu Mais Ações (•••) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenMenuEventId((prev) => (prev === event.id ? null : event.id))
                            }}
                            title="Mais ações do evento"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              border: isMenuOpen ? '1px solid #94a3b8' : '1px solid #e2e8f0',
                              background: isMenuOpen ? '#f1f5f9' : '#fff',
                              color: '#475569',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            <IconDots />
                          </button>

                          {/* Menu Dropdown Flutuante */}
                          {isMenuOpen && (
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                ...(isBottomRow
                                  ? { bottom: '100%', marginBottom: '6px' }
                                  : { top: '100%', marginTop: '6px' }),
                                background: '#fff',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                                padding: '5px',
                                minWidth: '200px',
                                zIndex: 100,
                                textAlign: 'left',
                                display: 'grid',
                                gap: '2px',
                              }}
                            >

                              <button
                                type="button"
                                onClick={() => {
                                  setEditEvent(event)
                                  setOpenMenuEventId(null)
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '7px 10px',
                                  border: 'none',
                                  background: 'transparent',
                                  borderRadius: '6px',
                                  color: '#4338ca',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#eef2ff' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                              >
                                <IconEdit />
                                Editar Evento
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setAttendeesEvent(event)
                                  setOpenMenuEventId(null)
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '7px 10px',
                                  border: 'none',
                                  background: 'transparent',
                                  borderRadius: '6px',
                                  color: '#334155',
                                  fontSize: '0.8rem',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                              >
                                <IconUsers />
                                Ver Participantes
                              </button>

                              {pendingCount > 0 && (
                                <button
                                  type="button"
                                  disabled={isActionLoading}
                                  onClick={() => {
                                    onSendReminders(event)
                                    setOpenMenuEventId(null)
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                    padding: '7px 10px',
                                    border: 'none',
                                    background: '#fffbeb',
                                    borderRadius: '6px',
                                    color: '#b45309',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: isActionLoading ? 'not-allowed' : 'pointer',
                                    textAlign: 'left',
                                  }}
                                >
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <IconBell /> Lembrar Pendentes
                                  </span>
                                  <span style={{ background: '#fef3c7', padding: '1px 6px', borderRadius: '999px', fontSize: '0.72rem' }}>
                                    {pendingCount}
                                  </span>
                                </button>
                              )}

                              <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />

                              {/* Alterar Status */}
                              <div style={{ padding: '4px 8px' }}>
                                <span style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                                  Alterar Status
                                </span>
                                <select
                                  value={event.status}
                                  disabled={isActionLoading}
                                  onChange={(e) => {
                                    void onChangeStatus(event, e.target.value as EventStatus)
                                    setOpenMenuEventId(null)
                                  }}
                                  style={{
                                    width: '100%',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    padding: '5px 8px',
                                    background: '#f8fafc',
                                    color: '#1e293b',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    cursor: isActionLoading ? 'not-allowed' : 'pointer',
                                    outline: 'none',
                                  }}
                                >
                                  {eventStatusOptions.map((s) => (
                                    <option key={s} value={s}>{eventStatusLabels[s]}</option>
                                  ))}
                                </select>
                              </div>

                              <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }} />

                              {/* Excluir Evento */}
                              <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={() => {
                                  setOpenMenuEventId(null)
                                  setEventToDelete(event)
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '7px 10px',
                                  border: 'none',
                                  background: 'transparent',
                                  borderRadius: '6px',
                                  color: '#dc2626',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  cursor: isActionLoading ? 'not-allowed' : 'pointer',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                              >
                                <IconTrash />
                                Excluir Evento
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            )}
          </div>
        ) : null}

        {attendeesEvent && (
          <AttendeesModal
            event={attendeesEvent}
            onClose={() => setAttendeesEvent(null)}
          />
        )}

        {/* Modal de confirmação de exclusão com motivo para notificar o organizador */}
        {eventToDelete && (
          <AdminDeleteConfirmModal
            event={eventToDelete}
            onConfirm={async (ev, reason) => {
              await onDelete(ev, reason)
            }}
            onClose={() => setEventToDelete(null)}
          />
        )}

      </AdminPanelCard>

      {detailsEvent && (
        <EventDetailsModal
          event={detailsEvent}
          onClose={() => setDetailsEvent(null)}
          onUpdated={onRefresh}
        />
      )}

      {editEvent && (
        <AdminEditEventModal
          event={editEvent}
          onClose={() => setEditEvent(null)}
          onSaved={() => {
            setEditEvent(null)
            onRefresh?.()
          }}
        />
      )}
    </>
  )
}

'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import type { AdminDashboardData } from '@mypass360/types'
import { AdminPanelCard } from './AdminPanelCard'
import { AdminSummaryCard } from './AdminSummaryCard'
import { eventStatusLabels, formatCurrency, formatDate, statusColor } from '../admin.utils'

type FilterType = 'revenue' | 'published' | 'pending' | 'users' | null

type AdminOverviewSectionProps = {
  dashboard: AdminDashboardData | null
  runningAction: string | null
  onSendReminders: (event: AdminEventItem) => void
}

// ─── Tabela: Receita / Pedidos Pagos ────────────────────────────────────────
type AdminEventItem = AdminDashboardData['events'][number]
type AdminUserItem = AdminDashboardData['users'][number]


function RevenueTable({ events }: { events: AdminEventItem[] }) {
  const COLS = '2fr 1.2fr 0.8fr 0.8fr'
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: '600px' }}>
        <TableHeader columns={['Evento', 'Data', 'Pedidos Pagos', 'Receita']} cols={COLS} />
        {events.map((event) => (
          <div key={event.id} style={makeRowStyle(COLS)}>
            <div>
              <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.93rem' }}>{event.title}</strong>
              <span style={{ color: '#64748b', fontSize: '0.83rem' }}>{event.slug}</span>
            </div>
            <div style={{ color: '#334155', fontSize: '0.9rem' }}>{formatDate(event.date)}</div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>{event.paidOrders}</div>
            <div style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrency(event.revenue)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tabela: Eventos Publicados ──────────────────────────────────────────────
function PublishedEventsTable({ events }: { events: AdminEventItem[] }) {
  const COLS = '2fr 1.5fr 0.8fr 0.6fr 0.8fr'
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: '700px' }}>
        <TableHeader columns={['Evento', 'Data / Local', 'Status', 'Pedidos', 'Receita']} cols={COLS} />
        {events.map((event) => (
          <div key={event.id} style={makeRowStyle(COLS)}>
            <div>
              <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.93rem' }}>{event.title}</strong>
            </div>
            <div style={{ color: '#334155', fontSize: '0.88rem', lineHeight: 1.45 }}>
              <div>{formatDate(event.date)}</div>
              <div style={{ color: '#94a3b8' }}>{event.location}</div>
            </div>
            <div>
              <span style={{
                display: 'inline-flex',
                padding: '0.3rem 0.65rem',
                borderRadius: '999px',
                background: `${statusColor(event.status)}18`,
                color: statusColor(event.status),
                fontWeight: 700,
                fontSize: '0.73rem',
                textTransform: 'uppercase',
              }}>
                {eventStatusLabels[event.status]}
              </span>
            </div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>{event.totalOrders}</div>
            <div style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrency(event.revenue)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tabela: Pedidos Pendentes ───────────────────────────────────────────────
function PendingOrdersTable({
  events,
  runningAction,
  onSendReminders,
}: {
  events: AdminEventItem[]
  runningAction: string | null
  onSendReminders: (event: AdminEventItem) => void
}) {
  const COLS = '2fr 0.8fr 0.6fr 0.6fr 0.6fr 1fr'
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: '580px' }}>
        <TableHeader columns={['Evento', 'Status', 'Pend.', 'Pagos', 'Total', 'Ação']} cols={COLS} />
        {events.map((event) => {
          const pending = event.totalOrders - event.paidOrders
          const isActionLoading = runningAction?.includes(event.id)
          return (
            <div key={event.id} style={makeRowStyle(COLS)}>
              <div>
                <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.93rem' }}>{event.title}</strong>
              </div>
              <div>
                <span style={{
                  display: 'inline-flex',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '999px',
                  background: `${statusColor(event.status)}18`,
                  color: statusColor(event.status),
                  fontWeight: 700,
                  fontSize: '0.73rem',
                  textTransform: 'uppercase',
                }}>
                  {eventStatusLabels[event.status]}
                </span>
              </div>
              <div style={{ fontWeight: 700, color: '#f59e0b' }}>{pending}</div>
              <div style={{ fontWeight: 700, color: '#16a34a' }}>{event.paidOrders}</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{event.totalOrders}</div>
              <div>
                {pending > 0 ? (
                  <button
                    type="button"
                    onClick={() => void onSendReminders(event)}
                    disabled={isActionLoading}
                    style={{
                      border: '1px solid #fde68a',
                      borderRadius: '10px',
                      padding: '0.4rem 0.6rem',
                      background: '#fffbeb',
                      color: '#b45309',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: isActionLoading ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Lembrar ({pending})
                  </button>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Nenhum</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ─── Tabela: Usuários ────────────────────────────────────────────────────────
function UsersTable({ users }: { users: AdminUserItem[] }) {
  const COLS = '2fr 0.8fr 0.8fr 1.1fr 0.75fr'
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: '680px' }}>
        <TableHeader columns={['Usuário', 'Provedor', 'Eventos criados', 'Último acesso', 'Status']} cols={COLS} />
        {users.map((user) => (
          <div key={user.id} style={makeRowStyle(COLS)}>
            <div>
              <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.93rem' }}>{user.name}</strong>
              <span style={{ color: '#64748b', fontSize: '0.83rem' }}>{user.email}</span>
            </div>
            <div style={{ color: '#334155', fontWeight: 600, fontSize: '0.9rem' }}>{user.provider}</div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>{user.createdEventsCount}</div>
            <div style={{ color: '#334155', fontSize: '0.87rem' }}>{formatDate(user.lastSignInAt)}</div>
            <div>
              <span style={{
                display: 'inline-flex',
                padding: '0.3rem 0.65rem',
                borderRadius: '999px',
                background: user.disabled ? '#fee2e2' : '#dcfce7',
                color: user.disabled ? '#b91c1c' : '#166534',
                fontWeight: 700,
                fontSize: '0.73rem',
              }}>
                {user.disabled ? 'Desativado' : 'Ativo'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeRowStyle(cols: string): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: cols,
    gap: '0.75rem',
    padding: '0.75rem 0',
    borderBottom: '1px solid #f1f5f9',
    alignItems: 'center',
  }
}

function TableHeader({ columns, cols }: { columns: string[]; cols: string }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: cols,
        gap: '0.75rem',
        padding: '0 0 0.65rem',
        borderBottom: '1px solid #e2e8f0',
        color: '#64748b',
        fontSize: '0.78rem',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        fontWeight: 700,
      }}
    >
      {columns.map((col) => (
        <div key={col}>{col}</div>
      ))}
    </div>
  )
}

// ─── FilteredTable wrapper ────────────────────────────────────────────────────
const filterConfig: Record<Exclude<FilterType, null>, { title: string; subtitle: string; color: string }> = {
  revenue: { title: 'Receita por evento', subtitle: 'Eventos ordenados por receita total acumulada.', color: '#6366f1' },
  published: { title: 'Eventos publicados', subtitle: 'Somente eventos com status publicado e visíveis ao público.', color: '#16a34a' },
  pending: { title: 'Pedidos pendentes', subtitle: 'Eventos com pedidos ainda não concluídos.', color: '#f59e0b' },
  users: { title: 'Base de usuários', subtitle: 'Todos os usuários cadastrados na plataforma.', color: '#6366f1' },
}

function FilteredTable({
  filter,
  dashboard,
  onClose,
  runningAction,
  onSendReminders,
}: {
  filter: Exclude<FilterType, null>
  dashboard: AdminDashboardData
  onClose: () => void
  runningAction: string | null
  onSendReminders: (event: AdminEventItem) => void
}) {
  const config = filterConfig[filter]
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  // Filter and sort items based on the active tab
  const sortedItems = useMemo(() => {
    switch (filter) {
      case 'revenue':
        return [...dashboard.events].sort((a, b) => b.revenue - a.revenue)
      case 'published':
        return dashboard.events.filter((e) => e.status === 'published')
      case 'pending':
        return dashboard.events
          .filter((e) => e.totalOrders - e.paidOrders > 0)
          .sort((a, b) => (b.totalOrders - b.paidOrders) - (a.totalOrders - a.paidOrders))
      case 'users':
        return dashboard.users
      default:
        return []
    }
  }, [filter, dashboard])

  // Reset page when filter or page size changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filter, itemsPerPage])

  const totalItems = sortedItems.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  
  const slicedItems = useMemo(() => {
    return sortedItems.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedItems, startIndex, itemsPerPage])

  const content = (() => {
    if (totalItems === 0) {
      return <p style={{ color: '#64748b', margin: '1rem 0' }}>Nenhum registro encontrado.</p>
    }
    switch (filter) {
      case 'revenue':
        return <RevenueTable events={slicedItems as AdminEventItem[]} />
      case 'published':
        return <PublishedEventsTable events={slicedItems as AdminEventItem[]} />
      case 'pending':
        return (
          <PendingOrdersTable
            events={slicedItems as AdminEventItem[]}
            runningAction={runningAction}
            onSendReminders={onSendReminders}
          />
        )
      case 'users':
        return <UsersTable users={slicedItems as AdminUserItem[]} />
    }
  })()


  return (
    <div
      style={{
        border: `1.5px solid ${config.color}33`,
        borderRadius: '18px',
        background: '#fff',
        boxShadow: `0 16px 40px ${config.color}18`,
        overflow: 'hidden',
        animation: 'slideDown 0.25s ease',
      }}
    >
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.25rem 0.75rem',
          borderBottom: `1px solid ${config.color}22`,
          background: `${config.color}06`,
        }}
      >
        <div>
          <p style={{ margin: 0, color: config.color, fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            TABELA FILTRADA
          </p>
          <h3 style={{ margin: '0.25rem 0 0', color: '#0f172a', fontSize: '1.05rem', fontWeight: 700 }}>{config.title}</h3>
          <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.86rem' }}>{config.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '0.45rem 0.85rem',
            background: '#fff',
            color: '#64748b',
            fontWeight: 700,
            fontSize: '0.83rem',
            cursor: 'pointer',
            transition: 'all 0.15s',
            flexShrink: 0,
          }}
        >
          ✕ Fechar
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '1rem 1.25rem 0.75rem' }}>
        {content}
      </div>

      {/* Pagination Footer */}
      {totalItems > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid #f1f5f9',
            background: '#fcfdff',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Page size controller */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Itens por página:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.3rem 0.5rem',
                background: '#fff',
                fontSize: '0.82rem',
                color: '#0f172a',
                cursor: 'pointer',
              }}
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          {/* Info */}
          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Mostrando <strong>{startIndex + 1}</strong> a <strong>{endIndex}</strong> de <strong>{totalItems}</strong> registros
          </span>

          {/* Page buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.4rem 0.75rem',
                background: currentPage === 1 ? '#f8fafc' : '#fff',
                color: currentPage === 1 ? '#cbd5e1' : '#64748b',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Anterior
            </button>
            <span style={{ fontSize: '0.82rem', color: '#64748b', minWidth: '4.5rem', textAlign: 'center' }}>
              Pág. <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '0.4rem 0.75rem',
                background: currentPage === totalPages ? '#f8fafc' : '#fff',
                color: currentPage === totalPages ? '#cbd5e1' : '#64748b',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Overview Tabs ────────────────────────────────────────────────────────────
type OverviewTab = 'visao' | 'eventos' | 'usuarios'

type OverviewTabsProps = {
  metrics: AdminDashboardData['metrics'] | undefined
  topEvents: AdminDashboardData['events']
  activeUsers: AdminDashboardData['users']
}

const overviewTabs: { id: OverviewTab; label: string; icon: string }[] = [
  { id: 'visao', label: 'Visão executiva', icon: '◈' },
  { id: 'eventos', label: 'Top eventos', icon: '◉' },
  { id: 'usuarios', label: 'Usuários', icon: '◎' },
]

function OverviewTabs({ metrics, topEvents, activeUsers }: OverviewTabsProps) {
  const [activeTab, setActiveTab] = useState<OverviewTab>('visao')

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
        overflow: 'hidden',
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #f1f5f9',
          background: '#fcfdff',
          gap: 0,
        }}
      >
        {overviewTabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
                color: isActive ? '#6366f1' : '#64748b',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: '0.85rem' }}>{tab.icon}</span>
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div style={{ padding: '1rem 1.1rem 1.1rem' }}>
        {activeTab === 'visao' && (
          <div style={{ display: 'grid', gap: '0.55rem' }}>
            {metrics ? (
              <>
                <div style={{ padding: '0.75rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.9rem' }}>Conversão operacional</strong>
                  <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    {metrics.totalOrders > 0
                      ? `${Math.round((metrics.paidOrders / metrics.totalOrders) * 100)}% dos pedidos estão pagos.`
                      : 'Ainda sem pedidos para medir conversão.'}
                  </span>
                </div>
                <div style={{ padding: '0.75rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.9rem' }}>Fila administrativa</strong>
                  <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    {metrics.draftEvents} eventos em rascunho e {metrics.pendingOrders} pedidos aguardando conclusão.
                  </span>
                </div>
                <div style={{ padding: '0.75rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.9rem' }}>Organizadores ativos</strong>
                  <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
                    {metrics.organizerUsers} usuários já cadastraram ao menos um evento.
                  </span>
                </div>
              </>
            ) : (
              <p style={{ color: '#64748b', margin: 0 }}>Sem dados suficientes para resumo.</p>
            )}
          </div>
        )}

        {activeTab === 'eventos' && (
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {topEvents.length === 0 ? (
              <p style={{ color: '#64748b', margin: 0 }}>Sem eventos para destacar.</p>
            ) : null}
            {topEvents.map((event) => (
              <div
                key={event.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '0.5rem',
                  alignItems: 'start',
                  padding: '0.65rem 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.9rem' }}>{event.title}</strong>
                  <span style={{ display: 'block', marginTop: '0.15rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                    {formatDate(event.date)} • {event.location}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ display: 'block', color: '#16a34a', fontSize: '0.88rem' }}>{formatCurrency(event.revenue)}</strong>
                  <span style={{ display: 'block', color: '#64748b', fontSize: '0.8rem' }}>{event.paidOrders} pagos</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'usuarios' && (
          <div style={{ display: 'grid', gap: '0.65rem' }}>
            {activeUsers.length === 0 ? (
              <p style={{ color: '#64748b', margin: 0 }}>Sem usuários ativos para exibir.</p>
            ) : null}
            {activeUsers.map((user) => (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.65rem 0',
                  borderBottom: '1px solid #f1f5f9',
                  gap: '0.75rem',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name}
                  </strong>
                  <span style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}
                  </span>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ display: 'block', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700 }}>{user.createdEventsCount} eventos</span>
                  <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.78rem' }}>
                    login {formatDate(user.lastSignInAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AdminOverviewSection({ dashboard, runningAction, onSendReminders }: AdminOverviewSectionProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>(null)

  const toggleFilter = useCallback((filter: Exclude<FilterType, null>) => {
    setActiveFilter((prev) => (prev === filter ? null : filter))
  }, [])

  const metrics = dashboard?.metrics
  const topEvents = (dashboard?.events ?? []).slice(0, 4)
  const activeUsers = (dashboard?.users ?? []).filter((user) => !user.disabled).slice(0, 4)

  return (
    <div style={{ display: 'grid', gap: '0.85rem' }}>
      {metrics ? (
        <section
          style={{
            display: 'grid',
            gap: '0.75rem',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          }}
        >
          <AdminSummaryCard
            title="Receita confirmada"
            value={formatCurrency(metrics.totalRevenue)}
            hint={`${metrics.paidOrders} pedidos pagos acumulados`}
            isClickable
            isActive={activeFilter === 'revenue'}
            accentColor="#6366f1"
            onClick={() => toggleFilter('revenue')}
          />
          <AdminSummaryCard
            title="Eventos publicados"
            value={String(metrics.publishedEvents)}
            hint={`${metrics.draftEvents} em rascunho • ${metrics.cancelledEvents} cancelados`}
            isClickable
            isActive={activeFilter === 'published'}
            accentColor="#16a34a"
            onClick={() => toggleFilter('published')}
          />
          <AdminSummaryCard
            title="Pedidos pendentes"
            value={String(metrics.pendingOrders)}
            hint={`${metrics.totalOrders} pedidos totais no sistema`}
            isClickable
            isActive={activeFilter === 'pending'}
            accentColor="#f59e0b"
            onClick={() => toggleFilter('pending')}
          />
          <AdminSummaryCard
            title="Base de usuários"
            value={String(metrics.totalUsers)}
            hint={`${metrics.organizerUsers} organizadores • ${metrics.disabledUsers} desativados`}
            isClickable
            isActive={activeFilter === 'users'}
            accentColor="#6366f1"
            onClick={() => toggleFilter('users')}
          />
        </section>
      ) : null}

      {/* Tabela filtrada */}
      {activeFilter !== null && dashboard ? (
        <FilteredTable
          filter={activeFilter}
          dashboard={dashboard}
          onClose={() => setActiveFilter(null)}
          runningAction={runningAction}
          onSendReminders={onSendReminders}
        />
      ) : null}

      <OverviewTabs metrics={metrics} topEvents={topEvents} activeUsers={activeUsers} />
    </div>
  )
}


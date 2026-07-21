'use client'

import { useState, useCallback } from 'react'
import type { AdminDashboardData } from '@mypass360/types'
import { AdminPanelCard } from './AdminPanelCard'
import { AdminSummaryCard } from './AdminSummaryCard'
import { eventStatusLabels, formatCurrency, formatDate, statusColor } from '../admin.utils'

type FilterType = 'revenue' | 'published' | 'pending' | 'users' | null

type AdminOverviewSectionProps = {
  dashboard: AdminDashboardData | null
}

// ─── Tabela: Receita / Pedidos Pagos ────────────────────────────────────────
function RevenueTable({ dashboard }: { dashboard: AdminDashboardData }) {
  const sorted = [...dashboard.events].sort((a, b) => b.revenue - a.revenue)
  if (sorted.length === 0) return <p style={{ color: '#64748b', margin: 0 }}>Nenhum evento com receita registrada.</p>

  const COLS = '2fr 1.2fr 0.8fr 0.8fr'
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: '600px' }}>
        <TableHeader columns={['Evento', 'Data', 'Pedidos Pagos', 'Receita']} cols={COLS} />
        {sorted.map((event) => (
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
function PublishedEventsTable({ dashboard }: { dashboard: AdminDashboardData }) {
  const filtered = dashboard.events.filter((e) => e.status === 'published')
  if (filtered.length === 0) return <p style={{ color: '#64748b', margin: 0 }}>Nenhum evento publicado no momento.</p>

  const COLS = '2fr 1.5fr 0.8fr 0.6fr 0.8fr'
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: '700px' }}>
        <TableHeader columns={['Evento', 'Data / Local', 'Status', 'Pedidos', 'Receita']} cols={COLS} />
        {filtered.map((event) => (
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
function PendingOrdersTable({ dashboard }: { dashboard: AdminDashboardData }) {
  const withPending = dashboard.events
    .filter((e) => e.totalOrders - e.paidOrders > 0)
    .sort((a, b) => (b.totalOrders - b.paidOrders) - (a.totalOrders - a.paidOrders))

  if (withPending.length === 0) return <p style={{ color: '#64748b', margin: 0 }}>Nenhum pedido pendente encontrado.</p>

  const COLS = '2.5fr 0.9fr 0.8fr 0.8fr 0.8fr'
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: '580px' }}>
        <TableHeader columns={['Evento', 'Status', 'Pendentes', 'Pagos', 'Total']} cols={COLS} />
        {withPending.map((event) => {
          const pending = event.totalOrders - event.paidOrders
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
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tabela: Usuários ────────────────────────────────────────────────────────
function UsersTable({ dashboard }: { dashboard: AdminDashboardData }) {
  if (dashboard.users.length === 0) return <p style={{ color: '#64748b', margin: 0 }}>Nenhum usuário encontrado.</p>

  const COLS = '2fr 0.8fr 0.8fr 1.1fr 0.75fr'
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: '680px' }}>
        <TableHeader columns={['Usuário', 'Provedor', 'Eventos criados', 'Último acesso', 'Status']} cols={COLS} />
        {dashboard.users.map((user) => (
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
}: {
  filter: Exclude<FilterType, null>
  dashboard: AdminDashboardData
  onClose: () => void
}) {
  const config = filterConfig[filter]

  const content = (() => {
    switch (filter) {
      case 'revenue':    return <RevenueTable dashboard={dashboard} />
      case 'published':  return <PublishedEventsTable dashboard={dashboard} />
      case 'pending':    return <PendingOrdersTable dashboard={dashboard} />
      case 'users':      return <UsersTable dashboard={dashboard} />
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
      <div style={{ padding: '1rem 1.25rem 1.25rem' }}>{content}</div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AdminOverviewSection({ dashboard }: AdminOverviewSectionProps) {
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
        />
      ) : null}

      <section
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'minmax(0, 1.45fr) minmax(320px, 0.95fr)',
          alignItems: 'start',
        }}
      >
        <AdminPanelCard title="Visão executiva" subtitle="Resumo operacional para tomada de decisão rápida.">
          {metrics ? (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <strong style={{ display: 'block', color: '#0f172a' }}>Conversão operacional</strong>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  {metrics.totalOrders > 0
                    ? `${Math.round((metrics.paidOrders / metrics.totalOrders) * 100)}% dos pedidos estão pagos.`
                    : 'Ainda sem pedidos para medir conversão.'}
                </span>
              </div>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <strong style={{ display: 'block', color: '#0f172a' }}>Fila administrativa</strong>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  {metrics.draftEvents} eventos em rascunho e {metrics.pendingOrders} pedidos aguardando conclusão.
                </span>
              </div>
              <div style={{ padding: '0.75rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <strong style={{ display: 'block', color: '#0f172a' }}>Organizadores ativos</strong>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  {metrics.organizerUsers} usuários já cadastraram ao menos um evento.
                </span>
              </div>
            </div>
          ) : (
            <p style={{ color: '#64748b' }}>Sem dados suficientes para resumo.</p>
          )}
        </AdminPanelCard>

        <div style={{ display: 'grid', gap: '0.85rem' }}>
          <AdminPanelCard title="Top eventos" subtitle="Os eventos com maior retorno no momento.">
            <div style={{ display: 'grid', gap: '0.8rem' }}>
              {topEvents.length === 0 ? <p style={{ color: '#64748b' }}>Sem eventos para destacar.</p> : null}
              {topEvents.map((event) => (
                <div key={event.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.8rem' }}>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.93rem' }}>{event.title}</strong>
                  <span style={{ display: 'block', marginTop: '0.25rem', color: '#64748b', fontSize: '0.85rem' }}>
                    {event.paidOrders} pagos • {formatCurrency(event.revenue)}
                  </span>
                  <span style={{ display: 'block', marginTop: '0.2rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                    {formatDate(event.date)} • {event.location}
                  </span>
                </div>
              ))}
            </div>
          </AdminPanelCard>

          <AdminPanelCard title="Usuários em atividade" subtitle="Quem está operando ou criando eventos.">
            <div style={{ display: 'grid', gap: '0.8rem' }}>
              {activeUsers.length === 0 ? <p style={{ color: '#64748b' }}>Sem usuários ativos para exibir.</p> : null}
              {activeUsers.map((user) => (
                <div key={user.id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.8rem' }}>
                  <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.92rem' }}>{user.name}</strong>
                  <span style={{ display: 'block', marginTop: '0.2rem', color: '#64748b', fontSize: '0.84rem' }}>{user.email}</span>
                  <span style={{ display: 'block', marginTop: '0.2rem', color: '#94a3b8', fontSize: '0.82rem' }}>
                    {user.createdEventsCount} eventos • último login {formatDate(user.lastSignInAt)}
                  </span>
                </div>
              ))}
            </div>
          </AdminPanelCard>
        </div>
      </section>
    </div>
  )
}

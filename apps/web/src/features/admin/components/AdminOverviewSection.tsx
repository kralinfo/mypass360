import type { AdminDashboardData } from '@mypass360/types'
import { AdminPanelCard } from './AdminPanelCard'
import { AdminSummaryCard } from './AdminSummaryCard'
import { formatCurrency, formatDate } from '../admin.utils'

type AdminOverviewSectionProps = {
  dashboard: AdminDashboardData | null
}

export function AdminOverviewSection({ dashboard }: AdminOverviewSectionProps) {
  const metrics = dashboard?.metrics
  const topEvents = (dashboard?.events ?? []).slice(0, 4)
  const activeUsers = (dashboard?.users ?? []).filter((user) => !user.disabled).slice(0, 4)

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {metrics ? (
        <section
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          }}
        >
          <AdminSummaryCard title="Receita confirmada" value={formatCurrency(metrics.totalRevenue)} hint={`${metrics.paidOrders} pedidos pagos acumulados`} />
          <AdminSummaryCard title="Eventos publicados" value={String(metrics.publishedEvents)} hint={`${metrics.draftEvents} em rascunho • ${metrics.cancelledEvents} cancelados`} />
          <AdminSummaryCard title="Pedidos pendentes" value={String(metrics.pendingOrders)} hint={`${metrics.totalOrders} pedidos totais no sistema`} />
          <AdminSummaryCard title="Base de usuários" value={String(metrics.totalUsers)} hint={`${metrics.organizerUsers} organizadores • ${metrics.disabledUsers} desativados`} />
        </section>
      ) : null}

      <section
        style={{
          display: 'grid',
          gap: '1.5rem',
          gridTemplateColumns: 'minmax(0, 1.45fr) minmax(360px, 0.95fr)',
          alignItems: 'start',
        }}
      >
        <AdminPanelCard title="Visão executiva" subtitle="Resumo operacional para tomada de decisão rápida.">
          {metrics ? (
            <div style={{ display: 'grid', gap: '0.9rem' }}>
              <div style={{ padding: '1rem', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <strong style={{ display: 'block', color: '#0f172a' }}>Conversão operacional</strong>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  {metrics.totalOrders > 0
                    ? `${Math.round((metrics.paidOrders / metrics.totalOrders) * 100)}% dos pedidos estão pagos.`
                    : 'Ainda sem pedidos para medir conversão.'}
                </span>
              </div>
              <div style={{ padding: '1rem', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <strong style={{ display: 'block', color: '#0f172a' }}>Fila administrativa</strong>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
                  {metrics.draftEvents} eventos em rascunho e {metrics.pendingOrders} pedidos aguardando conclusão.
                </span>
              </div>
              <div style={{ padding: '1rem', borderRadius: '14px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
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

        <div style={{ display: 'grid', gap: '1.5rem' }}>
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

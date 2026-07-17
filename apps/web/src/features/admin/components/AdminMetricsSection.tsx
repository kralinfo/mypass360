import type { AdminDashboardData } from '@mypass360/types'
import { AdminSummaryCard } from './AdminSummaryCard'
import { AdminPanelCard } from './AdminPanelCard'
import { formatCurrency } from '../admin.utils'

type AdminMetricsSectionProps = {
  dashboard: AdminDashboardData | null
}

export function AdminMetricsSection({ dashboard }: AdminMetricsSectionProps) {
  const metrics = dashboard?.metrics

  if (!metrics) {
    return <p style={{ color: '#64748b' }}>Sem indicadores disponíveis.</p>
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
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

      <section style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <AdminPanelCard title="Receita" subtitle="Panorama financeiro atual.">
          <strong style={{ display: 'block', color: '#0f172a', fontSize: '1.8rem' }}>{formatCurrency(metrics.totalRevenue)}</strong>
          <p style={{ margin: '0.7rem 0 0', color: '#64748b' }}>{metrics.paidOrders} pedidos pagos confirmados no sistema.</p>
        </AdminPanelCard>
        <AdminPanelCard title="Eventos" subtitle="Distribuição do ciclo de publicação.">
          <p style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>Publicados: {metrics.publishedEvents}</p>
          <p style={{ margin: '0.6rem 0 0', color: '#64748b' }}>Rascunhos: {metrics.draftEvents} • Cancelados: {metrics.cancelledEvents} • Encerrados: {metrics.finishedEvents}</p>
        </AdminPanelCard>
        <AdminPanelCard title="Usuários" subtitle="Base ativa e organizadores.">
          <p style={{ margin: 0, color: '#0f172a', fontWeight: 700 }}>Total: {metrics.totalUsers}</p>
          <p style={{ margin: '0.6rem 0 0', color: '#64748b' }}>Organizadores: {metrics.organizerUsers} • Desativados: {metrics.disabledUsers}</p>
        </AdminPanelCard>
      </section>
    </div>
  )
}

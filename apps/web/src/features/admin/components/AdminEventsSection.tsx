import type { AdminDashboardData, AdminEventItem, EventStatus } from '@mypass360/types'
import { AdminPanelCard } from './AdminPanelCard'
import { eventStatusOptions, eventStatusLabels, formatCurrency, formatDate, statusColor } from '../admin.utils'

type AdminEventsSectionProps = {
  dashboard: AdminDashboardData | null
  isLoading: boolean
  runningAction: string | null
  onChangeStatus: (event: AdminEventItem, status: EventStatus) => Promise<void>
  onDelete: (event: AdminEventItem) => Promise<void>
  onSendReminders: (event: AdminEventItem) => void
}

export function AdminEventsSection({ dashboard, isLoading, runningAction, onChangeStatus, onDelete, onSendReminders }: AdminEventsSectionProps) {
  return (
    <AdminPanelCard title="Operação de eventos" subtitle="Visualização densa para acompanhamento e tomada de decisão rápida.">
      {isLoading && !dashboard ? <p style={{ color: '#64748b' }}>Carregando eventos...</p> : null}
      {dashboard?.events.length === 0 ? <p style={{ color: '#64748b' }}>Nenhum evento encontrado.</p> : null}

      {dashboard?.events.length ? (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: '980px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 0.8fr 0.6fr 0.6fr 0.8fr 1.6fr',
                gap: '0.75rem',
                padding: '0 0 0.75rem',
                borderBottom: '1px solid #e2e8f0',
                color: '#64748b',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontWeight: 700,
              }}
            >
              <div>Evento</div>
              <div>Data / Local</div>
              <div>Status</div>
              <div>Pedidos</div>
              <div>Pagos</div>
              <div>Receita</div>
              <div>Ações</div>
            </div>

            {dashboard.events.map((event) => {
              const isActionLoading = runningAction?.includes(event.id)
              const pendingCount = event.totalOrders - event.paidOrders

              return (
                <div
                  key={event.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 0.8fr 0.6fr 0.6fr 0.8fr 1.6fr',
                    gap: '0.75rem',
                    padding: '0.95rem 0',
                    borderBottom: '1px solid #f1f5f9',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.98rem' }}>{event.title}</strong>
                    <span style={{ display: 'block', marginTop: '0.25rem', color: '#64748b', fontSize: '0.86rem' }}>
                      identificador: {event.slug}
                    </span>
                  </div>
                  <div style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.45 }}>
                    <div>{formatDate(event.date)}</div>
                    <div style={{ color: '#64748b', fontSize: '0.84rem' }}>{event.location}</div>
                  </div>
                  <div>
                    <span
                      style={{
                        display: 'inline-flex',
                        padding: '0.38rem 0.72rem',
                        borderRadius: '999px',
                        background: `${statusColor(event.status)}18`,
                        color: statusColor(event.status),
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                      }}
                    >
                      {eventStatusLabels[event.status]}
                    </span>
                  </div>
                  <div style={{ color: '#0f172a', fontWeight: 700 }}>{event.totalOrders}</div>
                  <div style={{ color: '#0f172a', fontWeight: 700 }}>{event.paidOrders}</div>
                  <div style={{ color: '#0f172a', fontWeight: 700 }}>{formatCurrency(event.revenue)}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                      value={event.status}
                      disabled={isActionLoading}
                      onChange={(changeEvent) => void onChangeStatus(event, changeEvent.target.value as EventStatus)}
                      style={{
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '0.58rem 0.7rem',
                        background: '#fff',
                        color: '#0f172a',
                        fontSize: '0.88rem',
                        flex: '1',
                      }}
                    >
                      {eventStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {eventStatusLabels[status]}
                        </option>
                      ))}
                    </select>

                    {pendingCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => void onSendReminders(event)}
                        disabled={isActionLoading}
                        style={{
                          border: '1px solid #fde68a',
                          borderRadius: '10px',
                          padding: '0.58rem 0.7rem',
                          background: '#fffbeb',
                          color: '#b45309',
                          fontWeight: 700,
                          fontSize: '0.84rem',
                          cursor: isActionLoading ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Lembrar ({pendingCount})
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void onDelete(event)}
                      disabled={isActionLoading}
                      style={{
                        border: '1px solid #fecaca',
                        borderRadius: '10px',
                        padding: '0.58rem 0.7rem',
                        background: '#fff5f5',
                        color: '#b91c1c',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: isActionLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </AdminPanelCard>
  )
}


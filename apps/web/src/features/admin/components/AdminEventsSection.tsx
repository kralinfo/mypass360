'use client'

import { useState } from 'react'
import type { AdminDashboardData, AdminEventItem, EventStatus } from '@mypass360/types'
import { AdminPanelCard } from './AdminPanelCard'
import { AttendeesModal } from './AttendeesModal'
import { eventStatusOptions, eventStatusLabels, formatCurrency, formatDate, statusColor } from '../admin.utils'

type AdminEventsSectionProps = {
  dashboard: AdminDashboardData | null
  isLoading: boolean
  runningAction: string | null
  onChangeStatus: (event: AdminEventItem, status: EventStatus) => Promise<void>
  onDelete: (event: AdminEventItem) => Promise<void>
  onSendReminders: (event: AdminEventItem) => void
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

export function AdminEventsSection({ dashboard, isLoading, runningAction, onChangeStatus, onDelete, onSendReminders }: AdminEventsSectionProps) {
  const [attendeesEvent, setAttendeesEvent] = useState<AdminEventItem | null>(null)

  return (
    <>
      <AdminPanelCard title="Operação de eventos" subtitle="Visualização densa para acompanhamento e tomada de decisão rápida.">
        {isLoading && !dashboard ? <p style={{ color: '#64748b' }}>Carregando eventos...</p> : null}
        {dashboard?.events.length === 0 ? <p style={{ color: '#64748b' }}>Nenhum evento encontrado.</p> : null}

        {dashboard?.events.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '24%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '7%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '25%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={TH}>Evento</th>
                  <th style={TH}>Data / Local</th>
                  <th style={TH}>Status</th>
                  <th style={{ ...TH, textAlign: 'center' }}>Pedidos</th>
                  <th style={{ ...TH, textAlign: 'center' }}>Pagos</th>
                  <th style={TH}>Receita</th>
                  <th style={TH}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.events.map((event) => {
                  const isActionLoading = runningAction?.includes(event.id)
                  const pendingCount = event.totalOrders - event.paidOrders
                  const hasPaidOrders = event.paidOrders > 0

                  return (
                    <tr
                      key={event.id}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#fafbff' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                    >
                      <td style={TD}>
                        <div
                          onClick={hasPaidOrders ? () => setAttendeesEvent(event) : undefined}
                          title={hasPaidOrders ? 'Clique para ver a lista de inscritos' : undefined}
                          style={{
                            display: 'inline-block',
                            cursor: hasPaidOrders ? 'pointer' : 'default',
                            borderRadius: '6px',
                            padding: '2px 4px 2px 0',
                            position: 'relative',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            if (!hasPaidOrders) return
                            const el = e.currentTarget as HTMLElement
                            el.style.background = '#eff1ff'
                            const b = el.querySelector('.ab') as HTMLElement | null
                            if (b) { b.style.opacity = '1'; b.style.transform = 'translateY(0)' }
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget as HTMLElement
                            el.style.background = ''
                            const b = el.querySelector('.ab') as HTMLElement | null
                            if (b) { b.style.opacity = '0'; b.style.transform = 'translateY(4px)' }
                          }}
                        >
                          <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.9rem', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {event.title}
                          </strong>
                          <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.72rem', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {event.slug}
                          </span>
                          {hasPaidOrders && (
                            <span className="ab" style={{
                              position: 'absolute', top: '100%', left: 0, marginTop: '2px',
                              display: 'inline-flex', alignItems: 'center', gap: '3px',
                              padding: '2px 7px', borderRadius: '999px',
                              background: '#6366f1', color: '#fff', fontSize: '0.65rem', fontWeight: 700,
                              opacity: 0, transform: 'translateY(4px)',
                              transition: 'opacity 0.15s, transform 0.15s',
                              whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none',
                            }}>
                              📋 Ver inscritos
                            </span>
                          )}
                        </div>
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
                          {eventStatusLabels[event.status]}
                        </span>
                      </td>

                      <td style={{ ...TD, textAlign: 'center', color: '#0f172a', fontWeight: 700 }}>{event.totalOrders}</td>
                      <td style={{ ...TD, textAlign: 'center', color: '#0f172a', fontWeight: 700 }}>{event.paidOrders}</td>
                      <td style={{ ...TD, color: '#0f172a', fontWeight: 700, whiteSpace: 'nowrap' }}>{formatCurrency(event.revenue)}</td>

                      <td style={TD}>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                          <select
                            value={event.status}
                            disabled={isActionLoading}
                            onChange={(e) => void onChangeStatus(event, e.target.value as EventStatus)}
                            style={{
                              border: '1px solid #cbd5e1', borderRadius: '8px', padding: '5px 6px',
                              background: '#fff', color: '#0f172a', fontSize: '0.8rem', cursor: 'pointer', flex: 1, minWidth: 0,
                            }}
                          >
                            {eventStatusOptions.map((s) => (
                              <option key={s} value={s}>{eventStatusLabels[s]}</option>
                            ))}
                          </select>

                          {pendingCount > 0 && (
                            <button
                              type="button"
                              onClick={() => onSendReminders(event)}
                              disabled={isActionLoading}
                              style={{
                                border: '1px solid #fde68a', borderRadius: '8px', padding: '5px 7px',
                                background: '#fffbeb', color: '#b45309', fontWeight: 700, fontSize: '0.75rem',
                                cursor: isActionLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                              }}
                            >
                              Lembrar ({pendingCount})
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => void onDelete(event)}
                            disabled={isActionLoading}
                            style={{
                              border: '1px solid #fecaca', borderRadius: '8px', padding: '5px 7px',
                              background: '#fff5f5', color: '#b91c1c', fontWeight: 700, fontSize: '0.75rem',
                              cursor: isActionLoading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                            }}
                          >
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </AdminPanelCard>

      {attendeesEvent && (
        <AttendeesModal
          event={attendeesEvent}
          onClose={() => setAttendeesEvent(null)}
        />
      )}
    </>
  )
}

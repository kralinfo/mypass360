'use client'

import type { AdminDashboardData } from '@mypass360/types'
import { formatCurrency } from '../admin.utils'

type Props = { dashboard: AdminDashboardData | null }

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  published: '#16a34a',
  draft:     '#f59e0b',
  cancelled: '#dc2626',
  finished:  '#6366f1',
  revenue:   '#6366f1',
  paid:      '#16a34a',
  pending:   '#f59e0b',
  users:     '#0ea5e9',
  bg:        '#f8fafc',
  border:    '#e2e8f0',
  text:      '#0f172a',
  muted:     '#64748b',
}

// ─── Shared card shell ────────────────────────────────────────────────────────
function Card({ title, subtitle, children, accent = '#6366f1' }: {
  title: string
  subtitle?: string
  children: React.ReactNode
  accent?: string
}) {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${C.border}`,
      borderRadius: '18px',
      boxShadow: '0 4px 20px rgba(15,23,42,0.05)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '1rem 1.25rem 0.6rem',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.6rem',
      }}>
        <div style={{ width: 3, height: 32, borderRadius: 99, background: accent, flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: C.text }}>{title}</p>
          {subtitle && <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: C.muted }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ padding: '1rem 1.25rem' }}>{children}</div>
    </div>
  )
}

// ─── KPI tile ─────────────────────────────────────────────────────────────────
function KpiTile({ label, value, sub, color = C.text, bg = '#f8fafc' }: {
  label: string; value: string; sub: string; color?: string; bg?: string
}) {
  return (
    <div style={{
      background: bg,
      border: `1px solid ${C.border}`,
      borderRadius: '14px',
      padding: '0.9rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.2rem',
    }}>
      <p style={{ margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, fontWeight: 700 }}>{label}</p>
      <strong style={{ fontSize: '1.55rem', color, fontWeight: 800, lineHeight: 1 }}>{value}</strong>
      <span style={{ fontSize: '0.78rem', color: C.muted }}>{sub}</span>
    </div>
  )
}

// ─── Donut chart (SVG) ────────────────────────────────────────────────────────
function DonutChart({ segments, size = 140, thickness = 26 }: {
  segments: { value: number; color: string; label: string }[]
  size?: number
  thickness?: number
}) {
  const r = (size - thickness) / 2
  const cx = size / 2
  const circumference = 2 * Math.PI * r
  const total = segments.reduce((s, seg) => s + seg.value, 0)

  if (total === 0) {
    return (
      <svg width={size} height={size}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={C.border} strokeWidth={thickness} />
        <text x={cx} y={cx + 5} textAnchor="middle" fill={C.muted} fontSize={12}>—</text>
      </svg>
    )
  }

  let offset = 0
  const arcs = segments.map((seg) => {
    const frac = seg.value / total
    const dash = frac * circumference
    const gap = circumference - dash
    const arc = { ...seg, dash, gap, offset, frac }
    offset += dash
    return arc
  })

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {arcs.map((arc, i) => (
        <circle
          key={i}
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={thickness}
          strokeDasharray={`${arc.dash} ${arc.gap}`}
          strokeDashoffset={-arc.offset}
          strokeLinecap="butt"
        />
      ))}
    </svg>
  )
}

// ─── Bar chart (SVG, horizontal) ──────────────────────────────────────────────
function HorizontalBarChart({ bars, height = 200 }: {
  bars: { label: string; value: number; color: string; formatted: string }[]
  height?: number
}) {
  const max = Math.max(...bars.map((b) => b.value), 1)
  const barH = Math.floor((height - (bars.length - 1) * 8) / bars.length)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {bars.map((bar, i) => {
        const pct = (bar.value / max) * 100
        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '0.8rem', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{bar.label}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: bar.color, flexShrink: 0 }}>{bar.formatted}</span>
            </div>
            <div style={{ height: barH > 14 ? 14 : barH, background: C.bg, borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: bar.color,
                borderRadius: 99,
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Vertical bar chart (SVG) ─────────────────────────────────────────────────
function VerticalBarChart({ bars, height = 140 }: {
  bars: { label: string; value: number; color: string }[]
  height?: number
}) {
  const max = Math.max(...bars.map((b) => b.value), 1)
  const gap = 8
  const barW = `calc(${100 / bars.length}% - ${gap}px)`

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap, height }}>
      {bars.map((bar, i) => {
        const pct = (bar.value / max) * 100
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: bar.color }}>{bar.value}</span>
            <div style={{ width: '100%', height: `${pct}%`, background: bar.color, borderRadius: '6px 6px 0 0', minHeight: 4, transition: 'height 0.6s ease' }} />
            <span style={{ fontSize: '0.68rem', color: C.muted, textAlign: 'center', lineHeight: 1.2 }}>{bar.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Semáforo / health light ──────────────────────────────────────────────────
function SemaphoreLight({ on, color }: { on: boolean; color: string }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: on ? color : `${color}30`,
      boxShadow: on ? `0 0 12px ${color}88` : 'none',
      transition: 'all 0.3s ease',
      border: `2px solid ${on ? color : `${color}60`}`,
    }} />
  )
}

function Semaphore({ label, value, thresholds, unit = '' }: {
  label: string
  value: number
  thresholds: { green: number; yellow: number }
  unit?: string
}) {
  const isGreen  = value >= thresholds.green
  const isYellow = !isGreen && value >= thresholds.yellow
  const isRed    = !isGreen && !isYellow

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem',
      borderRadius: '12px',
      background: C.bg,
      border: `1px solid ${C.border}`,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <SemaphoreLight on={isGreen}  color="#16a34a" />
        <SemaphoreLight on={isYellow} color="#f59e0b" />
        <SemaphoreLight on={isRed}    color="#dc2626" />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: '0.78rem', color: C.muted }}>{label}</p>
        <strong style={{ fontSize: '1.2rem', color: C.text }}>
          {value}{unit}
          <span style={{ marginLeft: 6, fontSize: '0.75rem', color: isGreen ? '#16a34a' : isYellow ? '#f59e0b' : '#dc2626', fontWeight: 700 }}>
            {isGreen ? '● Bom' : isYellow ? '● Atenção' : '● Crítico'}
          </span>
        </strong>
        <p style={{ margin: '0.1rem 0 0', fontSize: '0.74rem', color: C.muted }}>
          Meta: ≥{thresholds.green}{unit}
        </p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AdminMetricsSection({ dashboard }: Props) {
  const metrics = dashboard?.metrics
  const events  = dashboard?.events ?? []
  const users   = dashboard?.users  ?? []

  if (!metrics) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: C.muted }}>
        Sem indicadores disponíveis.
      </div>
    )
  }

  // Derived metrics
  const conversionRate = metrics.totalOrders > 0
    ? Math.round((metrics.paidOrders / metrics.totalOrders) * 100)
    : 0

  const activeUsers  = users.filter((u) => !u.disabled).length
  const disabledRate = metrics.totalUsers > 0
    ? Math.round((metrics.disabledUsers / metrics.totalUsers) * 100)
    : 0

  const topRevenueEvents = [...events]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)

  const revenueMaxForScale = Math.max(...topRevenueEvents.map((e) => e.revenue), 1)

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>

      {/* ── Row 1 – KPI tiles ─────────────────────────────────────── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
        <KpiTile
          label="Receita confirmada"
          value={formatCurrency(metrics.totalRevenue)}
          sub={`${metrics.paidOrders} pedidos pagos`}
          color={C.revenue}
          bg="#f5f3ff"
        />
        <KpiTile
          label="Taxa de conversão"
          value={`${conversionRate}%`}
          sub={`${metrics.pendingOrders} pedidos pendentes`}
          color={conversionRate >= 60 ? C.paid : conversionRate >= 30 ? C.draft : C.cancelled}
          bg="#f0fdf4"
        />
        <KpiTile
          label="Eventos ativos"
          value={String(metrics.publishedEvents)}
          sub={`${metrics.draftEvents} rascunhos • ${metrics.cancelledEvents} cancelados`}
          color="#0ea5e9"
          bg="#f0f9ff"
        />
        <KpiTile
          label="Usuários"
          value={String(metrics.totalUsers)}
          sub={`${metrics.organizerUsers} organizadores`}
          color={C.users}
          bg="#f0f9ff"
        />
      </section>

      {/* ── Row 2 – Charts ────────────────────────────────────────── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>

        {/* Donut: distribuição de status dos eventos */}
        <Card title="Status dos eventos" subtitle="Ciclo de vida de publicação" accent={C.draft}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <DonutChart
                size={130}
                thickness={24}
                segments={[
                  { value: metrics.publishedEvents, color: C.published, label: 'Publicado' },
                  { value: metrics.draftEvents,     color: C.draft,     label: 'Rascunho' },
                  { value: metrics.cancelledEvents, color: C.cancelled, label: 'Cancelado' },
                  { value: metrics.finishedEvents,  color: C.finished,  label: 'Encerrado' },
                ]}
              />
              {/* centre label */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <strong style={{ fontSize: '1.1rem', color: C.text }}>{metrics.publishedEvents + metrics.draftEvents + metrics.cancelledEvents + metrics.finishedEvents}</strong>
                <span style={{ fontSize: '0.65rem', color: C.muted }}>total</span>
              </div>
            </div>
            <div style={{ display: 'grid', gap: '0.4rem', flex: 1 }}>
              {[
                { label: 'Publicados',  value: metrics.publishedEvents, color: C.published },
                { label: 'Rascunhos',   value: metrics.draftEvents,     color: C.draft },
                { label: 'Cancelados',  value: metrics.cancelledEvents, color: C.cancelled },
                { label: 'Encerrados',  value: metrics.finishedEvents,  color: C.finished },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.78rem', color: C.muted, flex: 1 }}>{item.label}</span>
                  <strong style={{ fontSize: '0.82rem', color: C.text }}>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Donut: pedidos pagos vs pendentes */}
        <Card title="Conversão de pedidos" subtitle="Pagos vs. pendentes" accent={C.paid}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <DonutChart
                size={130}
                thickness={24}
                segments={[
                  { value: metrics.paidOrders,    color: C.paid,    label: 'Pago' },
                  { value: metrics.pendingOrders,  color: C.pending, label: 'Pendente' },
                ]}
              />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <strong style={{ fontSize: '1.1rem', color: C.text }}>{conversionRate}%</strong>
                <span style={{ fontSize: '0.65rem', color: C.muted }}>pagos</span>
              </div>
            </div>
            <div style={{ display: 'grid', gap: '0.4rem', flex: 1 }}>
              {[
                { label: 'Pagos',      value: metrics.paidOrders,    color: C.paid },
                { label: 'Pendentes',  value: metrics.pendingOrders, color: C.pending },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.78rem', color: C.muted, flex: 1 }}>{item.label}</span>
                  <strong style={{ fontSize: '0.82rem', color: C.text }}>{item.value}</strong>
                </div>
              ))}
              <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.6rem', borderRadius: '10px', background: C.bg, border: `1px solid ${C.border}` }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: C.muted }}>
                  <strong style={{ color: conversionRate >= 60 ? C.paid : conversionRate >= 30 ? C.draft : C.cancelled }}>{conversionRate}%</strong>
                  {' '}de conversão — {conversionRate >= 60 ? 'excelente 🎉' : conversionRate >= 30 ? 'pode melhorar' : 'atenção necessária'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Bar chart: distribuição de usuários */}
        <Card title="Base de usuários" subtitle="Perfis e atividade" accent={C.users}>
          <VerticalBarChart
            height={130}
            bars={[
              { label: 'Ativos',        value: activeUsers,                                  color: C.paid },
              { label: 'Organiz.',      value: metrics.organizerUsers,                       color: C.users },
              { label: 'Desativados',   value: metrics.disabledUsers,                        color: C.cancelled },
            ]}
          />
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: C.muted, textAlign: 'center' }}>
            {metrics.totalUsers} usuários cadastrados • {disabledRate}% inativos
          </p>
        </Card>
      </section>

      {/* ── Row 3 – Semáforos + Ranking de receita ────────────────── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '0.85rem' }}>

        {/* Semáforos de saúde */}
        <Card title="Saúde do sistema" subtitle="Indicadores de atenção" accent="#f59e0b">
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            <Semaphore
              label="Taxa de conversão de pedidos"
              value={conversionRate}
              thresholds={{ green: 60, yellow: 30 }}
              unit="%"
            />
            <Semaphore
              label="Eventos publicados"
              value={metrics.publishedEvents}
              thresholds={{ green: 3, yellow: 1 }}
              unit=""
            />
            <Semaphore
              label="Usuários ativos"
              value={activeUsers}
              thresholds={{ green: 5, yellow: 2 }}
              unit=""
            />
          </div>
        </Card>

        {/* Ranking de receita por evento */}
        <Card title="Ranking de receita por evento" subtitle="Os eventos com maior retorno financeiro" accent={C.revenue}>
          {topRevenueEvents.length === 0 ? (
            <p style={{ color: C.muted, margin: 0 }}>Nenhum evento com receita registrada.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {topRevenueEvents.map((event, i) => {
                const pct = revenueMaxForScale > 0 ? (event.revenue / revenueMaxForScale) * 100 : 0
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
                return (
                  <div key={event.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: '0.8rem', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
                        <span style={{ marginRight: '0.35rem' }}>{medal}</span>{event.title}
                      </span>
                      <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.75rem', color: C.muted }}>{event.paidOrders} pagos</span>
                        <strong style={{ fontSize: '0.8rem', color: C.revenue }}>{formatCurrency(event.revenue)}</strong>
                      </div>
                    </div>
                    <div style={{ height: 8, background: C.bg, borderRadius: 99, overflow: 'hidden', border: `1px solid ${C.border}` }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: i === 0 ? C.revenue : i === 1 ? '#8b5cf6' : '#a78bfa',
                        borderRadius: 99,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </section>

      {/* ── Row 4 – Status breakdown bars ─────────────────────────── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>

        {/* Pedidos por status */}
        <Card title="Pedidos" subtitle="Volume total por categoria" accent={C.pending}>
          <HorizontalBarChart
            bars={[
              { label: 'Pagos',      value: metrics.paidOrders,    color: C.paid,    formatted: String(metrics.paidOrders) },
              { label: 'Pendentes',  value: metrics.pendingOrders, color: C.pending, formatted: String(metrics.pendingOrders) },
              { label: 'Total',      value: metrics.totalOrders,   color: C.users,   formatted: String(metrics.totalOrders) },
            ]}
          />
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
            <div style={{ flex: 1, padding: '0.5rem', borderRadius: '10px', background: '#f0fdf4', textAlign: 'center' }}>
              <strong style={{ color: C.paid, fontSize: '1rem' }}>{metrics.paidOrders}</strong>
              <p style={{ margin: 0, fontSize: '0.7rem', color: C.muted }}>pagos</p>
            </div>
            <div style={{ flex: 1, padding: '0.5rem', borderRadius: '10px', background: '#fffbeb', textAlign: 'center' }}>
              <strong style={{ color: C.pending, fontSize: '1rem' }}>{metrics.pendingOrders}</strong>
              <p style={{ margin: 0, fontSize: '0.7rem', color: C.muted }}>pendentes</p>
            </div>
          </div>
        </Card>

        {/* Eventos por status breakdown */}
        <Card title="Eventos por status" subtitle="Distribuição de ciclo de vida" accent={C.published}>
          <HorizontalBarChart
            bars={[
              { label: 'Publicados',  value: metrics.publishedEvents, color: C.published, formatted: String(metrics.publishedEvents) },
              { label: 'Rascunhos',   value: metrics.draftEvents,     color: C.draft,     formatted: String(metrics.draftEvents) },
              { label: 'Encerrados',  value: metrics.finishedEvents,  color: C.finished,  formatted: String(metrics.finishedEvents) },
              { label: 'Cancelados',  value: metrics.cancelledEvents, color: C.cancelled, formatted: String(metrics.cancelledEvents) },
            ]}
          />
        </Card>
      </section>

    </div>
  )
}

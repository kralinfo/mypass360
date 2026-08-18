'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AdminEventItem } from '@mypass360/types'
import type { AdminAttendee } from '../admin.service'
import { fetchEventAttendees } from '../admin.service'

type AttendeesModalProps = {
  event: AdminEventItem
  onClose: () => void
}

function formatCpf(cpf: string | null): string {
  if (!cpf) return '—'
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return '—'
  }
}

function statusLabel(s: string): string {
  const map: Record<string, string> = { VALID: 'Válido', USED: 'Usado', CANCELLED: 'Cancelado', active: 'Ativo' }
  return map[s] ?? s
}

function statusColor(s: string): string {
  if (s === 'VALID' || s === 'active') return '#10b981'
  if (s === 'USED') return '#6366f1'
  return '#ef4444'
}

export function AttendeesModal({ event, onClose }: AttendeesModalProps) {
  const [attendees, setAttendees] = useState<AdminAttendee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    setIsLoading(true)
    fetchEventAttendees(event.id)
      .then(setAttendees)
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar inscritos.'))
      .finally(() => setIsLoading(false))
  }, [event.id])

  const filtered = attendees.filter((a) => {
    const q = search.toLowerCase()
    return (
      (a.name?.toLowerCase().includes(q) ?? false) ||
      (a.cpf?.includes(q) ?? false) ||
      (a.email?.toLowerCase().includes(q) ?? false) ||
      a.ticketTypeName.toLowerCase().includes(q)
    )
  })

  const downloadCsv = useCallback(() => {
    const rows = [
      ['#', 'Nome', 'CPF', 'E-mail', 'Tipo de Ingresso', 'Status', 'Emitido em'],
      ...attendees.map((a, i) => [
        String(i + 1),
        a.name ?? '',
        formatCpf(a.cpf),
        a.email ?? '',
        a.ticketTypeName,
        statusLabel(a.status),
        formatDate(a.issuedAt),
      ]),
    ]
    const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inscritos-${event.title.replace(/\s+/g, '-').toLowerCase()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [attendees, event.title])

  const handlePrint = useCallback(() => {
    const content = printRef.current?.innerHTML ?? ''
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8"/>
        <title>Lista de Inscritos — ${event.title}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 32px; color: #0f172a; }
          h1 { font-size: 1.2rem; margin-bottom: 4px; }
          p  { font-size: 0.85rem; color: #64748b; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
          th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 700; border: 1px solid #e2e8f0; }
          td { padding: 7px 10px; border: 1px solid #e2e8f0; }
          tr:nth-child(even) td { background: #f8fafc; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>
        <h1>Lista de Inscritos — ${event.title}</h1>
        <p>Total: ${attendees.length} inscrito(s) &nbsp;|&nbsp; Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
        ${content}
      </body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 400)
  }, [attendees.length, event.title])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(2, 6, 23, 0.6)',
          backdropFilter: 'blur(4px)',
          animation: 'amFadeIn 0.18s ease',
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1001,
          width: '96vw', maxWidth: '860px',
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 32px 80px rgba(2,6,23,0.22)',
          overflow: 'hidden',
          animation: 'amSlideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          padding: '20px 24px',
          color: '#fff',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          flexShrink: 0,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', opacity: 0.8, textTransform: 'uppercase' }}>
              Lista de Inscritos
            </p>
            <h2 style={{ margin: '4px 0 0', fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.2 }}>
              {event.title}
            </h2>
            {!isLoading && (
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', opacity: 0.8 }}>
                {attendees.length} inscrito{attendees.length !== 1 ? 's' : ''} no total
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none',
              borderRadius: '10px', padding: '6px 10px',
              color: '#fff', fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Toolbar */}
        {!isLoading && !error && attendees.length > 0 && (
          <div style={{
            padding: '12px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex', gap: '10px', alignItems: 'center',
            flexShrink: 0, flexWrap: 'wrap',
          }}>
            <input
              type="search"
              placeholder="Buscar por nome, CPF, e-mail ou tipo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1, minWidth: '200px',
                padding: '0.52rem 0.8rem',
                borderRadius: '10px', border: '1px solid #e2e8f0',
                fontSize: '0.88rem', outline: 'none',
                background: '#f8fafc', color: '#0f172a',
              }}
            />
            <button
              type="button"
              onClick={downloadCsv}
              style={{
                padding: '0.52rem 1rem', borderRadius: '10px',
                border: '1px solid #e2e8f0', background: '#f8fafc',
                color: '#0f172a', fontWeight: 700, fontSize: '0.85rem',
                cursor: 'pointer', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              ⬇ Baixar CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: '0.52rem 1rem', borderRadius: '10px',
                border: 'none', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                cursor: 'pointer', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
              }}
            >
              🖨 Imprimir
            </button>
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: '16px' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                border: '3px solid #e2e8f0', borderTopColor: '#6366f1',
                animation: 'amSpin 0.7s linear infinite',
              }} />
              <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Carregando inscritos...</p>
            </div>
          )}

          {error && (
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
              <p style={{ color: '#ef4444', fontWeight: 600 }}>❌ {error}</p>
            </div>
          )}

          {!isLoading && !error && attendees.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '2rem', marginBottom: '12px' }}>📋</p>
              <p style={{ color: '#64748b', fontWeight: 600 }}>Nenhum inscrito com dados encontrado.</p>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '6px' }}>
                Os dados aparecem após o pagamento ser confirmado e os ingressos gerados.
              </p>
            </div>
          )}

          {!isLoading && !error && filtered.length === 0 && attendees.length > 0 && (
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
              <p style={{ color: '#64748b' }}>Nenhum inscrito encontrado para &quot;<strong>{search}</strong>&quot;</p>
            </div>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <div ref={printRef} style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['#', 'Nome completo', 'CPF', 'E-mail', 'Tipo', 'Status', 'Emitido em'].map((h) => (
                      <th key={h} style={{
                        padding: '10px 14px', textAlign: 'left',
                        fontWeight: 700, fontSize: '0.75rem', color: '#64748b',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, idx) => (
                    <tr
                      key={a.ticketId}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '' }}
                    >
                      <td style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 600, fontSize: '0.8rem' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                        {a.name ?? <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Não informado</span>}
                      </td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#334155', fontSize: '0.82rem' }}>
                        {formatCpf(a.cpf)}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569', fontSize: '0.82rem' }}>
                        {a.email ?? '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 9px', borderRadius: '999px',
                          background: '#ede9fe', color: '#5b21b6',
                          fontWeight: 700, fontSize: '0.72rem',
                          whiteSpace: 'nowrap',
                        }}>
                          {a.ticketTypeName}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 9px', borderRadius: '999px',
                          background: `${statusColor(a.status)}18`,
                          color: statusColor(a.status),
                          fontWeight: 700, fontSize: '0.72rem',
                        }}>
                          {statusLabel(a.status)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {formatDate(a.issuedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer count */}
        {!isLoading && !error && attendees.length > 0 && (
          <div style={{
            padding: '10px 20px',
            borderTop: '1px solid #f1f5f9',
            background: '#fafafa',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: '0.8rem', color: '#64748b', flexShrink: 0,
          }}>
            <span>
              Exibindo <strong style={{ color: '#0f172a' }}>{filtered.length}</strong> de{' '}
              <strong style={{ color: '#0f172a' }}>{attendees.length}</strong> inscrito(s)
            </span>
            <span style={{ color: '#94a3b8' }}>Código público visível apenas no PDF do ingresso</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes amFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes amSlideUp {
          from{opacity:0;transform:translate(-50%,calc(-50% + 32px))}
          to{opacity:1;transform:translate(-50%,-50%)}
        }
        @keyframes amSpin { to{transform:rotate(360deg)} }
      `}</style>
    </>
  )
}

import { useCallback, useEffect, useState } from 'react'
import type { AdminEventItem, CheckinAccess, CheckinRecord, Event } from '@mypass360/types'
import {
  createEventCheckinAccess,
  deleteEventCheckin,
  deleteEventCheckinAccess,
  fetchEventCheckinAccesses,
  fetchEventCheckins,
  fetchEventDetails,
  resetEventCheckins,
  updateEventCheckinAccess,
  updateEventCheckinStatus,
  type AdminEventDetails,
} from '../admin.service'

import { eventStatusLabels, formatCurrency, formatDate, statusColor } from '../admin.utils'

interface EventDetailsModalProps {
  event: AdminEventItem | Event
  onClose: () => void
  onUpdated?: () => void
}

type TabType = 'overview' | 'accesses' | 'checkins'

function formatCpf(cpf: string | null): string {
  if (!cpf) return '—'
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

// Ícones SVG minimalistas
const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
)
const IconLink = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
)
const IconExternal = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
)
const IconRefresh = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15.3-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15.3 6.7L3 16"/></svg>
)
const IconDownload = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
)
const IconTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
)
const IconCopy = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
)
const IconDot = ({ color }: { color: string }) => (
  <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
)

export function EventDetailsModal({ event, onClose, onUpdated }: EventDetailsModalProps) {

  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [details, setDetails] = useState<AdminEventDetails | null>(null)
  const [accesses, setAccesses] = useState<CheckinAccess[]>([])
  const [checkins, setCheckins] = useState<CheckinRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchCheckin, setSearchCheckin] = useState('')

  // Formulário de novo acesso
  const [showNewAccessForm, setShowNewAccessForm] = useState(false)
  const [newAccessName, setNewAccessName] = useState('')
  const [isSubmittingAccess, setIsSubmittingAccess] = useState(false)

  // Feedback de cópia
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Reset de check-ins (DEV)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [resetFeedback, setResetFeedback] = useState<string | null>(null)

  // Status Mestre do Check-in do Evento (Ativo/Desativado)
  const [isTogglingCheckin, setIsTogglingCheckin] = useState(false)

  // Modais de Confirmação Customizados
  const [deleteAccessTarget, setDeleteAccessTarget] = useState<CheckinAccess | null>(null)
  const [deleteCheckinTarget, setDeleteCheckinTarget] = useState<CheckinRecord | null>(null)
  const [isDeletingTarget, setIsDeletingTarget] = useState(false)

  // Fechar no Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteAccessTarget) setDeleteAccessTarget(null)
        else if (deleteCheckinTarget) setDeleteCheckinTarget(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, deleteAccessTarget, deleteCheckinTarget])

  // Carregar dados
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [detailsData, accessesData, checkinsData] = await Promise.all([
        fetchEventDetails(event.id),
        fetchEventCheckinAccesses(event.id),
        fetchEventCheckins(event.id),
      ])
      setDetails(detailsData)
      setAccesses(accessesData)
      setCheckins(checkinsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar detalhes do evento.')
    } finally {
      setIsLoading(false)
    }
  }, [event.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Alternar Status Mestre de Check-in do Evento
  const handleToggleEventCheckin = async () => {
    const newStatus = !(details?.checkin_enabled !== false)
    setIsTogglingCheckin(true)
    try {
      await updateEventCheckinStatus(event.id, newStatus)
      setDetails((prev) => (prev ? { ...prev, checkin_enabled: newStatus } : null))
      setResetFeedback(
        newStatus
          ? '🟢 Portaria reaberta! O check-in deste evento está ativo.'
          : '🔴 Portaria pausada! O check-in deste evento foi desativado.'
      )
      setTimeout(() => setResetFeedback(null), 4000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao alternar status do check-in.')
    } finally {
      setIsTogglingCheckin(false)
    }
  }

  // Criar credencial
  const handleCreateAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAccessName.trim()) return

    setIsSubmittingAccess(true)
    try {
      const created = await createEventCheckinAccess(event.id, newAccessName.trim())
      setAccesses((prev) => [...prev, created])
      setNewAccessName('')
      setShowNewAccessForm(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao criar acesso de check-in.')
    } finally {
      setIsSubmittingAccess(false)
    }
  }

  // Ativar / Desativar credencial
  const handleToggleAccess = async (access: CheckinAccess) => {
    try {
      const updated = await updateEventCheckinAccess(event.id, access.id, {
        isActive: !access.isActive,
      })
      setAccesses((prev) => prev.map((a) => (a.id === access.id ? updated : a)))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar acesso.')
    }
  }

  // Confirmar exclusão de credencial de portaria via modal personalizado
  const handleConfirmDeleteAccess = async () => {
    if (!deleteAccessTarget) return
    setIsDeletingTarget(true)
    try {
      await deleteEventCheckinAccess(event.id, deleteAccessTarget.id)
      setAccesses((prev) => prev.filter((a) => a.id !== deleteAccessTarget.id))
      setDeleteAccessTarget(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir acesso.')
    } finally {
      setIsDeletingTarget(false)
    }
  }

  // Copiar código ou link
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(id)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // Limpar check-ins (DEV)
  const handleResetCheckins = async () => {
    setIsResetting(true)
    setResetFeedback(null)
    try {
      const result = await resetEventCheckins(event.id)
      setResetFeedback(`✓ ${result.message}`)
      setShowResetConfirm(false)
      await loadData()
      onUpdated?.()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao resetar check-ins.')
    } finally {
      setIsResetting(false)
    }
  }

  // Confirmar cancelamento de check-in individual via modal personalizado
  const handleConfirmDeleteSingleCheckin = async () => {
    if (!deleteCheckinTarget) return
    setIsDeletingTarget(true)
    const ident = deleteCheckinTarget.participantName
      ? `${deleteCheckinTarget.participantName} (${deleteCheckinTarget.publicCode})`
      : deleteCheckinTarget.publicCode

    try {
      await deleteEventCheckin(event.id, deleteCheckinTarget.id)
      setCheckins((prev) => prev.filter((c) => c.id !== deleteCheckinTarget.id))
      setDetails((prev) => (prev ? { ...prev, checkedInTickets: Math.max(0, prev.checkedInTickets - 1) } : null))
      setResetFeedback(`✓ Check-in de ${ident} cancelado com sucesso.`)
      setTimeout(() => setResetFeedback(null), 3500)
      setDeleteCheckinTarget(null)
      onUpdated?.()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao cancelar check-in.')
    } finally {
      setIsDeletingTarget(false)
    }
  }


  // Exportar CSV de check-ins

  const handleExportCsv = () => {
    const isAnonymous = details?.ticket_layout !== 'formal_pdf' && details?.participant_id_type === 'none'
    const headers = isAnonymous
      ? ['#', 'Código Ingresso', 'Tipo de Ingresso', 'Data/Hora Entrada', 'Operador/Portaria']
      : ['#', 'Nome Participante', 'CPF', 'Código Ingresso', 'Tipo de Ingresso', 'Data/Hora Entrada', 'Operador/Portaria']

    const rows = checkins.map((c, i) => {
      if (isAnonymous) {
        return [
          String(i + 1),
          c.publicCode,
          c.ticketTypeName,
          formatDateTime(c.checkedInAt),
          c.operatorName ?? '—',
        ]
      }
      return [
        String(i + 1),
        c.participantName ?? '—',
        formatCpf(c.participantCpf ?? null),
        c.publicCode,
        c.ticketTypeName,
        formatDateTime(c.checkedInAt),
        c.operatorName ?? '—',
      ]
    })

    const csvContent = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `checkins-${event.slug || event.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredCheckins = checkins.filter((c) => {
    const q = searchCheckin.toLowerCase()
    return (
      (c.participantName?.toLowerCase().includes(q) ?? false) ||
      (c.participantCpf?.includes(q) ?? false) ||
      c.publicCode.toLowerCase().includes(q) ||
      c.ticketTypeName.toLowerCase().includes(q) ||
      (c.operatorName?.toLowerCase().includes(q) ?? false)
    )
  })

  const checkedInCount = checkins.length
  const totalTickets = details?.totalTickets ?? ('paidOrders' in event ? event.paidOrders : 0)
  const attendanceRate = totalTickets > 0 ? Math.round((checkedInCount / totalTickets) * 100) : 0
  const isAnonymousEvent = details?.ticket_layout !== 'formal_pdf' && details?.participant_id_type === 'none'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'ed-modal-scale 0.2s ease-out',
        }}
      >
        <style>{`
          @keyframes ed-modal-scale {
            from { opacity: 0; transform: scale(0.97); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>

        {/* ── HEADER ── */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '1rem',
            background: 'linear-gradient(to right, #f8fafc, #ffffff)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                {event.title}
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: `${statusColor(event.status)}1a`,
                  color: statusColor(event.status),
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                }}
              >
                {eventStatusLabels[event.status]}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              📍 {event.location} • 📅 {formatDate(event.date)}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap', flexShrink: 0 }}>
            {/* Botão Mestre de Ativação/Desativação de Check-in */}
            <button
              type="button"
              onClick={handleToggleEventCheckin}
              disabled={isTogglingCheckin}
              title={details?.checkin_enabled !== false ? 'Clique para pausar o check-in' : 'Clique para reabrir o check-in'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: details?.checkin_enabled !== false ? '1px solid #bbf7d0' : '1px solid #fecaca',
                background: details?.checkin_enabled !== false ? '#f0fdf4' : '#fef2f2',
                color: details?.checkin_enabled !== false ? '#166534' : '#991b1b',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: isTogglingCheckin ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              <IconDot color={details?.checkin_enabled !== false ? '#16a34a' : '#dc2626'} />
              {isTogglingCheckin
                ? 'Atualizando...'
                : details?.checkin_enabled !== false
                ? 'Portaria Aberta'
                : 'Portaria Fechada'}
            </button>

            {/* Botão para copiar link do Check-in */}
            <button
              type="button"
              onClick={() => {
                const url = accesses.length > 0
                  ? `${window.location.origin}/checkin?code=${accesses[0].code}`
                  : `${window.location.origin}/checkin`
                handleCopy(url, 'header-checkin-link')
              }}
              title="Copiar Link de Acesso à Portaria"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: '#fff',
                color: '#334155',
                fontSize: '0.78rem',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s',
              }}
            >
              {copiedCode === 'header-checkin-link' ? <IconCheck /> : <IconLink />}
              {copiedCode === 'header-checkin-link' ? 'Link Copiado!' : 'Copiar Link'}
            </button>

            <a
              href="/checkin"
              target="_blank"
              rel="noreferrer"
              title="Abrir Terminal de Portaria em nova aba"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #4f46e5',
                background: '#4f46e5',
                color: '#fff',
                textDecoration: 'none',
                fontSize: '0.78rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                transition: 'opacity 0.15s',
              }}
            >
              <IconExternal />
              Abrir Portaria
            </a>

            <button
              onClick={onClose}
              title="Fechar Detalhes"
              style={{
                border: 'none',
                background: '#f1f5f9',
                borderRadius: '6px',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
                fontSize: '0.9rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

        </div>

        {/* ── TABS NAV ── */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: '#fafafa',
            padding: '0 1.5rem',
            gap: '0.5rem',
          }}
        >
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              background: 'transparent',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'overview' ? 700 : 500,
              color: activeTab === 'overview' ? '#4f46e5' : '#64748b',
              borderBottom: activeTab === 'overview' ? '2px solid #4f46e5' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('accesses')}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              background: 'transparent',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'accesses' ? 700 : 500,
              color: activeTab === 'accesses' ? '#4f46e5' : '#64748b',
              borderBottom: activeTab === 'accesses' ? '2px solid #4f46e5' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            Acessos de Portaria ({accesses.length})
          </button>
          <button
            onClick={() => setActiveTab('checkins')}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              background: 'transparent',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'checkins' ? 700 : 500,
              color: activeTab === 'checkins' ? '#4f46e5' : '#64748b',
              borderBottom: activeTab === 'checkins' ? '2px solid #4f46e5' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            Check-ins Realizados ({checkins.length})
          </button>
        </div>


        {/* ── BODY ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {isLoading && !details ? (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>
              Carregando detalhes do evento...
            </p>
          ) : error ? (
            <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c' }}>
              {error}
            </div>
          ) : (
            <>
              {resetFeedback && (
                <div style={{
                  marginBottom: '1rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                }}>
                  {resetFeedback}
                </div>
              )}

              {/* ── TAB 1: VISÃO GERAL ── */}
              {activeTab === 'overview' && (
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                  {/* Cards de Métricas */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Ingressos Emitidos
                      </p>
                      <strong style={{ display: 'block', fontSize: '1.5rem', color: '#0f172a', marginTop: '4px' }}>
                        {totalTickets}
                      </strong>
                    </div>

                    <div style={{ padding: '1rem', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                        Check-ins Realizados
                      </p>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '4px' }}>
                        <strong style={{ fontSize: '1.5rem', color: '#15803d' }}>
                          {checkedInCount}
                        </strong>
                        <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>
                          ({attendanceRate}% presença)
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: '1rem', borderRadius: '12px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>
                        Receita Aprovada
                      </p>
                      <strong style={{ display: 'block', fontSize: '1.5rem', color: '#1e40af', marginTop: '4px' }}>
                        {formatCurrency('revenue' in event ? event.revenue : (details?.price ? details.price * (details.totalTickets ?? 0) : 0))}
                      </strong>
                    </div>
                  </div>

                  {/* Configurações do Evento */}
                  <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff' }}>
                    <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>
                      Configurações de Identificação e Layout
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Modelo de Layout:</span>
                        <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#1e293b' }}>
                          {details?.ticket_layout === 'formal_pdf'
                            ? '📄 PDF Formal (A4 com Nome e CPF obrigatórios)'
                            : '🎫 Ingresso Digital (Ticket Compacto)'}
                        </p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Identificação de Portador:</span>
                        <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#1e293b' }}>
                          {details?.participant_id_type === 'none'
                            ? 'Livre / Sem Nome (Anônimo e Transferível)'
                            : details?.participant_id_type === 'name_cpf'
                            ? 'Nome e CPF'
                            : 'Nome do Portador'}
                        </p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Capacidade Total:</span>
                        <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#1e293b' }}>
                          {details?.capacity ? `${details.capacity} participantes` : 'Ilimitada'}
                        </p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Portaria / Check-in:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '3px' }}>
                          <span style={{
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            color: details?.checkin_enabled !== false ? '#15803d' : '#b91c1c',
                          }}>
                            {details?.checkin_enabled !== false ? '🟢 Aberta' : '🔴 Fechada'}
                          </span>
                          <button
                            type="button"
                            onClick={handleToggleEventCheckin}
                            disabled={isTogglingCheckin}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: '#f8fafc',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#334155',
                              cursor: isTogglingCheckin ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {isTogglingCheckin ? '...' : details?.checkin_enabled !== false ? 'Pausar' : 'Reabrir'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* ── TAB 2: ACESSOS DE CHECK-IN ── */}
              {activeTab === 'accesses' && (
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>
                        Credenciais de Portaria
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                        Cadastre acessos exclusivos para a equipe de recepção validar ingressos deste evento.
                      </p>
                    </div>
                    {!showNewAccessForm && (
                      <button
                        onClick={() => setShowNewAccessForm(true)}
                        style={{
                          padding: '0.5rem 0.9rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#0f172a',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        + Cadastrar acesso
                      </button>
                    )}
                  </div>

                  {/* Form de Criação */}
                  {showNewAccessForm && (
                    <form
                      onSubmit={handleCreateAccess}
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-end',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '240px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                          Nome / Identificação do Acesso:
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Portaria Principal, Portão B, Operador Ana"
                          value={newAccessName}
                          onChange={(e) => setNewAccessName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.875rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmittingAccess || !newAccessName.trim()}
                        style={{
                          padding: '0.55rem 1rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#4f46e5',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: isSubmittingAccess ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isSubmittingAccess ? 'Cadastrando...' : 'Salvar Acesso'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewAccessForm(false)}
                        style={{
                          padding: '0.55rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          color: '#64748b',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        Cancelar
                      </button>
                    </form>
                  )}

                  {/* Tabela de Acessos */}
                  {accesses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2.5rem', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>Nenhum acesso cadastrado para este evento.</p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                        Clique em &quot;Cadastrar acesso&quot; para gerar uma credencial para a portaria.
                      </p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>Nome / Ponto</th>
                            <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>Código de Acesso</th>
                            <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>Status</th>
                            <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>Último Uso</th>
                            <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700, textAlign: 'right' }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accesses.map((acc) => {
                            const checkinUrl = typeof window !== 'undefined'
                              ? `${window.location.origin}/checkin?code=${acc.code}`
                              : `/checkin?code=${acc.code}`

                            return (
                              <tr key={acc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0f172a' }}>
                                  {acc.name}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                                      {acc.code}
                                    </code>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(acc.code, `code-${acc.id}`)}
                                      title="Copiar código"
                                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b' }}
                                    >
                                      {copiedCode === `code-${acc.id}` ? <IconCheck /> : <IconCopy />}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleCopy(checkinUrl, `url-${acc.id}`)}
                                      title="Copiar Link Direto para o Operador"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        border: '1px solid #e2e8f0',
                                        background: '#fff',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.72rem',
                                        color: '#334155',
                                        fontWeight: 500,
                                      }}
                                    >
                                      {copiedCode === `url-${acc.id}` ? <IconCheck /> : <IconLink />}
                                      {copiedCode === `url-${acc.id}` ? 'Link Copiado!' : 'Copiar Link'}
                                    </button>
                                  </div>
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <button
                                    onClick={() => handleToggleAccess(acc)}
                                    style={{
                                      border: 'none',
                                      padding: '2px 8px',
                                      borderRadius: '999px',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      background: acc.isActive ? '#dcfce7' : '#f1f5f9',
                                      color: acc.isActive ? '#15803d' : '#64748b',
                                      textTransform: 'uppercase',
                                    }}
                                  >
                                    {acc.isActive ? '● Ativo' : '○ Inativo'}
                                  </button>
                                </td>
                                <td style={{ padding: '10px 14px', color: '#64748b' }}>
                                  {acc.lastUsedAt ? formatDateTime(acc.lastUsedAt) : 'Nunca utilizado'}
                                </td>
                                <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                  <button
                                    onClick={() => setDeleteAccessTarget(acc)}
                                    title="Excluir credencial"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      border: 'none',
                                      background: 'transparent',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                      fontSize: '0.78rem',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                    }}
                                  >
                                    <IconTrash />
                                    Excluir
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── TAB 3: CHECK-INS REALIZADOS ── */}
              {activeTab === 'checkins' && (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <input
                        type="text"
                        placeholder="Buscar por nome, CPF, código ou operador..."
                        value={searchCheckin}
                        onChange={(e) => setSearchCheckin(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={loadData}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '0.5rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          color: '#334155',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        <IconRefresh />
                        Atualizar
                      </button>
                      {checkins.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={handleExportCsv}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '0.5rem 0.85rem',
                              borderRadius: '8px',
                              border: '1px solid #0f172a',
                              background: '#0f172a',
                              color: '#fff',
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            <IconDownload />
                            Exportar CSV
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowResetConfirm(true)}
                            title="Limpar todos os check-ins e restaurar ingressos para válido"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '0.5rem 0.85rem',
                              borderRadius: '8px',
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#b91c1c',
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            <IconTrash />
                            Limpar Todos
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Banner de Confirmação de Limpeza Total de Check-ins */}
                  {showResetConfirm && (
                    <div
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: '12px',
                        border: '1px solid #fca5a5',
                        background: '#fef2f2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                        <div>
                          <strong style={{ display: 'block', fontSize: '0.9rem', color: '#991b1b' }}>
                            Deseja realmente limpar TODOS os check-ins deste evento?
                          </strong>
                          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#b91c1c' }}>
                            Esta ação apagará todos os {checkins.length} registros de entrada e restaurará todos os ingressos para o status VÁLIDO.
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={handleResetCheckins}
                          disabled={isResetting}
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#dc2626',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: isResetting ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isResetting ? 'Limpando...' : 'Confirmar Limpeza'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowResetConfirm(false)}
                          style={{
                            padding: '0.5rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            color: '#475569',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {checkins.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>
                        Nenhum check-in realizado até o momento.
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                        Assim que a portaria validar os ingressos com o leitor de QR Code, eles aparecerão aqui em tempo real.
                      </p>
                    </div>
                  ) : filteredCheckins.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>
                      Nenhum check-in encontrado com o termo filtrado.
                    </p>
                  ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            {!isAnonymousEvent && (
                              <>
                                <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>Participante</th>
                                <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>CPF</th>
                              </>
                            )}
                            <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>Código</th>
                            <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>Tipo de Ingresso</th>
                            <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>Horário Check-in</th>
                            <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700 }}>Validado Por</th>
                            <th style={{ padding: '10px 14px', color: '#64748b', fontWeight: 700, textAlign: 'right' }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCheckins.map((c) => (
                            <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              {!isAnonymousEvent && (
                                <>
                                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                                    {c.participantName ?? '—'}
                                  </td>
                                  <td style={{ padding: '10px 14px', color: '#64748b', fontFamily: 'monospace' }}>
                                    {formatCpf(c.participantCpf ?? null)}
                                  </td>
                                </>
                              )}
                              <td style={{ padding: '10px 14px' }}>
                                <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                                  {c.publicCode}
                                </code>
                              </td>
                              <td style={{ padding: '10px 14px', color: '#334155' }}>
                                {c.ticketTypeName}
                              </td>
                              <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 600 }}>
                                {formatDateTime(c.checkedInAt)}
                              </td>
                              <td style={{ padding: '10px 14px', color: '#64748b' }}>
                                <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
                                  {c.operatorName ?? 'Portaria Padrão'}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  onClick={() => setDeleteCheckinTarget(c)}
                                  title="Excluir este check-in e restaurar o ingresso para válido"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    border: '1px solid #fecaca',
                                    background: '#fff',
                                    color: '#dc2626',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  <IconTrash />
                                  Excluir
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de Confirmação Personalizado: Exclusão de Credencial de Portaria */}
      {deleteAccessTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem',
          }}
          onClick={() => !isDeletingTarget && setDeleteAccessTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconTrash />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
                  Remover Credencial de Portaria
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Revogação imediata de acesso
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
              Deseja realmente excluir a credencial <strong>{deleteAccessTarget?.name}</strong> (código <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', color: '#4f46e5', fontWeight: 700 }}>{deleteAccessTarget?.code}</code>)?
              <br />
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px', display: 'block' }}>
                O operador não conseguirá mais realizar check-ins utilizando este link ou código.
              </span>
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                disabled={isDeletingTarget}
                onClick={() => setDeleteAccessTarget(null)}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingTarget}
                onClick={handleConfirmDeleteAccess}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: isDeletingTarget ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <IconTrash />
                {isDeletingTarget ? 'Removendo...' : 'Sim, Remover Acesso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação Personalizado: Exclusão / Cancelamento de Check-in */}
      {deleteCheckinTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem',
          }}
          onClick={() => !isDeletingTarget && setDeleteCheckinTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '440px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconTrash />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
                  Cancelar Check-in de Ingresso
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Restauração de status do ingresso
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.5, margin: '0 0 1.25rem' }}>
              Deseja realmente cancelar o check-in do ingresso{' '}
              <strong>
                {deleteCheckinTarget?.participantName
                  ? `${deleteCheckinTarget.participantName} (${deleteCheckinTarget.publicCode})`
                  : deleteCheckinTarget?.publicCode}
              </strong>?
              <br />
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px', display: 'block' }}>
                O ingresso voltará imediatamente para o status <strong>VÁLIDO</strong> e poderá ser lido novamente na portaria.
              </span>
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                disabled={isDeletingTarget}
                onClick={() => setDeleteCheckinTarget(null)}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={isDeletingTarget}
                onClick={handleConfirmDeleteSingleCheckin}
                style={{
                  padding: '0.55rem 1.1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: isDeletingTarget ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <IconTrash />
                {isDeletingTarget ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

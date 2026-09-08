'use client'

import { AdminEventsSection } from '@/features/admin/components/AdminEventsSection'
import { AdminMetricsSection } from '@/features/admin/components/AdminMetricsSection'
import { AdminOverviewSection } from '@/features/admin/components/AdminOverviewSection'
import { AdminUsersSection } from '@/features/admin/components/AdminUsersSection'
import { AdminPublicationsTabContainer } from '@/features/admin/components/AdminPublicationsTabContainer'
import { AdminDeletionsTabContainer } from '@/features/admin/components/AdminDeletionsTabContainer'
import { AdminMessagesSection } from '@/features/admin/components/AdminMessagesSection'
import { ReminderModal } from '@/features/admin/components/ReminderModal'
import type { AdminSection } from '@/features/admin/admin.types'
import { getAdminSection } from '@/features/admin/admin.utils'
import { useAdminDashboard } from '@/features/admin/useAdminDashboard'
import { useMemo, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'

const sectionContent: Record<AdminSection, { eyebrow: string; title: string; description: string }> = {
  painel: {
    eyebrow: 'VISÃO GERAL',
    title: 'Central operacional do MyPass360',
    description: 'Resumo executivo com leitura rápida de métricas, destaques e atividade recente.',
  },
  indicadores: {
    eyebrow: 'INDICADORES',
    title: 'Métricas administrativas',
    description: 'Panorama consolidado para receita, pedidos, eventos e base de usuários.',
  },
  eventos: {
    eyebrow: 'EVENTOS',
    title: 'Operação de eventos',
    description: 'Gerencie status, acompanhe pedidos e execute ações operacionais em um único ponto.',
  },
  usuarios: {
    eyebrow: 'USUÁRIOS',
    title: 'Gestão de usuários',
    description: 'Controle contas ativas, organizadores e ações administrativas sobre acessos.',
  },
  aprovacoes: {
    eyebrow: 'PUBLICAÇÕES',
    title: 'Publicações',
    description: 'Gestão de solicitações de publicação e histórico de análises de eventos.',
  },
  publicacoes: {
    eyebrow: 'PUBLICAÇÕES',
    title: 'Publicações',
    description: 'Gestão de solicitações de publicação e histórico de análises de eventos.',
  },
  exclusoes: {
    eyebrow: 'EXCLUSÕES',
    title: 'Exclusões',
    description: 'Gestão de solicitações de exclusão de eventos e histórico de análises.',
  },
  mensagens: {
    eyebrow: 'MENSAGENS',
    title: 'Central de mensagens e diálogo',
    description: 'Comunicação direta em tempo real com os organizadores de eventos.',
  },
}

export function AdminPageContent() {
  const searchParams = useSearchParams()
  const activeSection = useMemo(() => getAdminSection(searchParams.get('sec')), [searchParams])
  const sectionHeader = sectionContent[activeSection]
  const [refreshKey, setRefreshKey] = useState(0)
  const {
    dashboard,
    isLoading,
    error,
    runningAction,
    reminderModal,
    loadDashboard,
    handleEventStatusChange,
    handleEventDelete,
    handleUserToggle,
    handleUserDelete,
    handleSendPendingReminders,
    handleReminderConfirm,
    handleReminderClose,
  } = useAdminDashboard()

  const handleRefreshAll = useCallback(async () => {
    await loadDashboard()
    setRefreshKey((prev) => prev + 1)
  }, [loadDashboard])

  const currentSection = useMemo(() => {
    switch (activeSection) {
      case 'indicadores':
        return <AdminMetricsSection dashboard={dashboard} />
      case 'eventos':
        return (
          <AdminEventsSection
            dashboard={dashboard}
            isLoading={isLoading}
            runningAction={runningAction}
            onChangeStatus={handleEventStatusChange}
            onDelete={handleEventDelete}
            onSendReminders={handleSendPendingReminders}
            onRefresh={handleRefreshAll}
          />
        )
      case 'usuarios':
        return (
          <AdminUsersSection
            dashboard={dashboard}
            isLoading={isLoading}
            runningAction={runningAction}
            onToggle={handleUserToggle}
            onDelete={handleUserDelete}
          />
        )
      case 'aprovacoes':
      case 'publicacoes':
        return <AdminPublicationsTabContainer key={refreshKey} />
      case 'exclusoes':
        return <AdminDeletionsTabContainer key={refreshKey} />
      case 'mensagens':
        return <AdminMessagesSection dashboard={dashboard} refreshKey={refreshKey} onRefresh={handleRefreshAll} />
      default:
        return (
          <AdminOverviewSection
            dashboard={dashboard}
            runningAction={runningAction}
            onSendReminders={handleSendPendingReminders}
          />
        )
    }
  }, [
    activeSection,
    dashboard,
    handleEventDelete,
    handleEventStatusChange,
    handleRefreshAll,
    handleUserDelete,
    handleUserToggle,
    handleSendPendingReminders,
    isLoading,
    refreshKey,
    runningAction,
  ])

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '1.25rem 1.5rem 2rem',
        maxWidth: '1280px',
        margin: '0 auto',
      }}
    >
      <section
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ maxWidth: '56rem' }}>
          <p style={{ margin: 0, color: '#6366f1', fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.78rem' }}>{sectionHeader.eyebrow}</p>
          <h1 style={{ margin: '0.3rem 0 0', fontSize: '1.7rem', color: '#020617', lineHeight: 1.1 }}>{sectionHeader.title}</h1>
          <p style={{ margin: '0.4rem 0 0', color: '#64748b', maxWidth: '60rem', lineHeight: 1.5, fontSize: '0.9rem' }}>{sectionHeader.description}</p>
        </div>

        <button
          type="button"
          onClick={() => void handleRefreshAll()}
          disabled={isLoading}
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '0.6rem 1rem',
            background: '#fff',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            color: '#0f172a',
            fontWeight: 700,
            fontSize: '0.88rem',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
          }}
        >
          {isLoading ? 'Atualizando...' : 'Atualizar painel'}
        </button>
      </section>

      {error ? (
        <div
          style={{
            marginBottom: '1rem',
            padding: '1rem 1.25rem',
            borderRadius: '14px',
            background: '#fee2e2',
            color: '#991b1b',
            border: '1px solid #fecaca',
          }}
        >
          {error}
        </div>
      ) : null}

      {currentSection}

      {/* Modal de lembretes — renderizado no topo para overlay correto */}
      {reminderModal && (
        <ReminderModal
          event={reminderModal.event}
          state={reminderModal.state}
          sentCount={reminderModal.sentCount}
          errorMessage={reminderModal.errorMessage}
          onConfirm={() => void handleReminderConfirm()}
          onClose={handleReminderClose}
        />
      )}
    </main>
  )
}
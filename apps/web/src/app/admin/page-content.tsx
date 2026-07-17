'use client'

import { AdminEventsSection } from '@/features/admin/components/AdminEventsSection'
import { AdminMetricsSection } from '@/features/admin/components/AdminMetricsSection'
import { AdminOverviewSection } from '@/features/admin/components/AdminOverviewSection'
import { AdminUsersSection } from '@/features/admin/components/AdminUsersSection'
import type { AdminSection } from '@/features/admin/admin.types'
import { getAdminSection } from '@/features/admin/admin.utils'
import { useAdminDashboard } from '@/features/admin/useAdminDashboard'
import { useMemo } from 'react'
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
}

export function AdminPageContent() {
  const searchParams = useSearchParams()
  const activeSection = useMemo(() => getAdminSection(searchParams.get('sec')), [searchParams])
  const sectionHeader = sectionContent[activeSection]
  const { dashboard, isLoading, error, runningAction, loadDashboard, handleEventStatusChange, handleEventDelete, handleUserToggle, handleUserDelete } =
    useAdminDashboard()

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
      default:
        return <AdminOverviewSection dashboard={dashboard} />
    }
  }, [activeSection, dashboard, handleEventDelete, handleEventStatusChange, handleUserDelete, handleUserToggle, isLoading, runningAction])

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '2rem 2rem 3rem',
        maxWidth: '1440px',
        margin: '0 auto',
      }}
    >
      <section
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '2rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ maxWidth: '56rem' }}>
          <p style={{ margin: 0, color: '#6366f1', fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.82rem' }}>{sectionHeader.eyebrow}</p>
          <h1 style={{ margin: '0.55rem 0 0', fontSize: '2.3rem', color: '#020617', lineHeight: 1.08 }}>{sectionHeader.title}</h1>
          <p style={{ margin: '0.9rem 0 0', color: '#64748b', maxWidth: '60rem', lineHeight: 1.6 }}>{sectionHeader.description}</p>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={isLoading}
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: '14px',
            padding: '0.9rem 1.15rem',
            background: '#fff',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            color: '#0f172a',
            fontWeight: 700,
            minWidth: '170px',
            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)',
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
    </main>
  )
}
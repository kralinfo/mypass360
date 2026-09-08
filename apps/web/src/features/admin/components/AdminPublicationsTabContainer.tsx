'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { AdminApprovalsSection } from './AdminApprovalsSection'
import { PublicationHistorySection } from './PublicationHistorySection'

export function AdminPublicationsTabContainer({ refreshKey }: { refreshKey?: number }) {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('sub') === 'history' || searchParams.get('tab') === 'history' ? 'history' : 'approvals'
  const [activeTab, setActiveTab] = useState<'approvals' | 'history'>(initialTab)

  useEffect(() => {
    const tabParam = searchParams.get('sub') || searchParams.get('tab')
    if (tabParam === 'history') {
      setActiveTab('history')
    } else if (tabParam === 'approvals') {
      setActiveTab('approvals')
    }
  }, [searchParams])

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {/* ── SUB-ABAS DE PUBLICAÇÕES ── */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('approvals')}
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'approvals' ? '#0f172a' : '#f1f5f9',
            color: activeTab === 'approvals' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'approvals' ? '0 4px 12px rgba(15, 23, 42, 0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          🚀 Aprovar publicações
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'history' ? '#0f172a' : '#f1f5f9',
            color: activeTab === 'history' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'history' ? '0 4px 12px rgba(15, 23, 42, 0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          📜 Histórico de publicações
        </button>
      </div>

      {activeTab === 'approvals' ? (
        <AdminApprovalsSection key={refreshKey} />
      ) : (
        <PublicationHistorySection key={refreshKey} />
      )}
    </div>
  )
}

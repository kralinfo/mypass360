'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { AdminDeletionSection } from './AdminDeletionSection'
import { DeletionHistorySection } from './DeletionHistorySection'

export function AdminDeletionsTabContainer({ refreshKey }: { refreshKey?: number }) {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('sub') === 'history' || searchParams.get('tab') === 'history' ? 'history' : 'deletions'
  const [activeTab, setActiveTab] = useState<'deletions' | 'history'>(initialTab)

  useEffect(() => {
    const tabParam = searchParams.get('sub') || searchParams.get('tab')
    if (tabParam === 'history') {
      setActiveTab('history')
    } else if (tabParam === 'deletions') {
      setActiveTab('deletions')
    }
  }, [searchParams])

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {/* ── SUB-ABAS DE EXCLUSÕES ── */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab('deletions')}
          style={{
            padding: '0.55rem 1.15rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'deletions' ? '#0f172a' : '#f1f5f9',
            color: activeTab === 'deletions' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'deletions' ? '0 4px 12px rgba(15, 23, 42, 0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          🗑️ Aprovar exclusões
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
          📜 Histórico de exclusões
        </button>
      </div>

      {activeTab === 'deletions' ? (
        <AdminDeletionSection key={refreshKey} />
      ) : (
        <DeletionHistorySection key={refreshKey} />
      )}
    </div>
  )
}

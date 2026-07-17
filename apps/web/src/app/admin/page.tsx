'use client'

import { Suspense } from 'react'
import { AdminPageContent } from './page-content'

export default function AdminPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#64748b' }}>Carregando painel administrativo...</div>}>
      <AdminPageContent />
    </Suspense>
  )
}
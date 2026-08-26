'use client'

import { AdminShell } from '@/components/AdminShell'
import { Footer } from '@/components/Footer'
import { Navbar } from '@/components/Navbar'
import { usePathname } from 'next/navigation'
import { Suspense } from 'react'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin-login'
  const isAdminLoginRoute = pathname === '/admin-login'
  const isCheckinRoute = pathname.startsWith('/checkin')
  const showPublicChrome = !isAdminRoute && !isAdminLoginRoute && !isCheckinRoute


  return (
    <>
      {showPublicChrome ? <Navbar /> : null}

      {isAdminRoute ? (
        <Suspense fallback={<div style={{ padding: '2rem', color: '#64748b' }}>Carregando painel...</div>}>
          <AdminShell>{children}</AdminShell>
        </Suspense>
      ) : (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: isAdminLoginRoute ? '#f8fafc' : '#fff',
          }}
        >
          <main className="app-main-content" style={{ flex: 1, paddingTop: showPublicChrome ? '76px' : 0 }}>{children}</main>
          {showPublicChrome ? <Footer /> : null}
        </div>
      )}
    </>
  )
}
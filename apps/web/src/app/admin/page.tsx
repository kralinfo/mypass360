import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminPageContent } from './page-content'

// Server-side admin guard — second layer after middleware
async function getAdminSession() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session
}

function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false
  const allowed = (process.env.ADMIN_EMAILS ?? 'admin@mypass360.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
  return allowed.includes(email.toLowerCase())
}

export default async function AdminPage() {
  const session = await getAdminSession()

  if (!session || !isAdminEmail(session.user?.email)) {
    redirect('/admin-login')
  }

  return (
    <Suspense fallback={<div style={{ padding: '2rem', color: '#64748b' }}>Carregando painel administrativo...</div>}>
      <AdminPageContent />
    </Suspense>
  )
}
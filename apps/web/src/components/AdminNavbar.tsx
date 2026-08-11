'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { SignOutButton } from '@/features/auth/components/SignOutButton'

const adminLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/eventos/cadastrar', label: 'Novo evento' },
  { href: '/eventos', label: 'Eventos' },
]

export function AdminNavbar() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        borderBottom: '1px solid #1f2937',
        background: '#020617',
        color: '#fff',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link
            href="/admin"
            style={{ color: '#fff', textDecoration: 'none', fontSize: '1.1rem', fontWeight: 700 }}
          >
            MyPass360 Admin
          </Link>

          <nav style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {adminLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  color: '#cbd5e1',
                  textDecoration: 'none',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(148, 163, 184, 0.08)',
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <Link
            href="/"
            style={{
              color: '#a78bfa',
              textDecoration: 'none',
              fontSize: '0.95rem',
              fontWeight: 600,
            }}
          >
            Ver site público
          </Link>
          <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{user?.email ?? 'Administrador'}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}
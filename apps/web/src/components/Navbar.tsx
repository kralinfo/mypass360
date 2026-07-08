'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { SignOutButton } from '@/features/auth/components/SignOutButton'

export function Navbar() {
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
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 2rem',
        background: '#0f172a',
        color: '#fff',
      }}
    >
      <Link href="/" style={{ color: '#fff', textDecoration: 'none', fontSize: '1.25rem', fontWeight: 'bold' }}>
        MyPass360
      </Link>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <Link href="/eventos" style={{ color: '#fff', textDecoration: 'none' }}>
          Eventos
        </Link>
        {user ? (
          <>
            <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              {user.user_metadata?.name ?? user.email}
            </span>
            <SignOutButton />
          </>
        ) : (
          <Link
            href="/login"
            style={{
              color: '#0f172a',
              background: '#fff',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500',
            }}
          >
            Entrar
          </Link>
        )}
      </div>
    </nav>
  )
}

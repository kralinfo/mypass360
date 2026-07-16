'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { SignOutButton } from '@/features/auth/components/SignOutButton'
import { useCart } from '@/features/cart/cart-context'

export function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [animateCart, setAnimateCart] = useState(false)
  const { totalQuantity } = useCart()
  const previousQuantity = useRef(totalQuantity)

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

  useEffect(() => {
    if (previousQuantity.current === totalQuantity) {
      return
    }

    setAnimateCart(true)
    const timeout = window.setTimeout(() => setAnimateCart(false), 400)
    previousQuantity.current = totalQuantity

    return () => window.clearTimeout(timeout)
  }, [totalQuantity])

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 2rem',
        background: '#0f172a',
        color: '#fff',
        zIndex: 1000,
      }}
    >
      <Link href="/" style={{ color: '#fff', textDecoration: 'none', fontSize: '1.25rem', fontWeight: 'bold' }}>
        MyPass360
      </Link>

      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
        <Link href="/eventos" style={{ color: '#fff', textDecoration: 'none' }}>
          Eventos
        </Link>
        {user && (
          <Link
            href="/eventos/cadastrar"
            style={{
              color: '#0f172a',
              background: '#a78bfa',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '500',
            }}
          >
            + Cadastrar Evento
          </Link>
        )}
        <Link
          href="/carrinho"
          style={{
            color: '#fff',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}
        >
          <span
            aria-label="Carrinho"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '2rem',
              height: '2rem',
              borderRadius: '50%',
              background: animateCart ? '#fff' : 'rgba(255,255,255,0.1)',
              color: animateCart ? '#0f172a' : '#fff',
              fontSize: '1rem',
              transition: 'transform 0.2s ease, background-color 0.2s ease, color 0.2s ease',
              transform: animateCart ? 'scale(1.15)' : 'scale(1)',
            }}
          >
            🛒
          </span>
          <span
            style={{
              minWidth: '1.4rem',
              height: '1.4rem',
              padding: '0 0.35rem',
              borderRadius: '999px',
              background: totalQuantity > 0 ? '#f59e0b' : 'rgba(255,255,255,0.15)',
              color: totalQuantity > 0 ? '#0f172a' : '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {totalQuantity}
          </span>
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

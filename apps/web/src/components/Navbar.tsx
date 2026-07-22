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
  const [menuOpen, setMenuOpen] = useState(false)
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
    <>
      <style>{`
        .nav-links {
          display: flex;
          gap: 1.25rem;
          align-items: center;
        }
        .menu-toggle {
          display: none;
          background: transparent;
          border: none;
          color: #fff;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.25rem;
          line-height: 1;
        }
        .mobile-menu {
          display: none;
          position: fixed;
          top: 70px;
          left: 0;
          right: 0;
          background: #0f172a;
          border-bottom: 1px solid #1e293b;
          padding: 1.5rem;
          flex-direction: column;
          gap: 1rem;
          z-index: 999;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
          transform: translateY(-10px);
          opacity: 0;
          transition: all 0.2s ease-in-out;
          pointer-events: none;
        }
        .mobile-menu.open {
          display: flex;
          transform: translateY(0);
          opacity: 1;
          pointer-events: auto;
        }
        @media (max-width: 768px) {
          .nav-links {
            display: none;
          }
          .menu-toggle {
            display: block;
          }
        }
      `}</style>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          background: '#0f172a',
          color: '#fff',
          zIndex: 1000,
          height: '70px',
          boxSizing: 'border-box',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <Link 
          href="/" 
          style={{ color: '#fff', textDecoration: 'none', fontSize: '1.2rem', fontWeight: 'bold', letterSpacing: '-0.02em' }}
          onClick={() => setMenuOpen(false)}
        >
          MyPass360
        </Link>

        {/* Desktop Links & Right Side */}
        <div className="nav-links">
          <Link href="/eventos" style={{ color: '#fff', textDecoration: 'none', fontSize: '0.92rem', fontWeight: 500 }}>
            Eventos
          </Link>
          {user && (
            <Link href="/meus-eventos" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '0.92rem', fontWeight: 500 }}>
              Meus Eventos
            </Link>
          )}
          {user && (
            <Link
              href="/eventos/cadastrar"
              style={{
                color: '#0f172a',
                background: '#a78bfa',
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.88rem',
                transition: 'background-color 0.2s',
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
                width: '1.85rem',
                height: '1.85rem',
                borderRadius: '50%',
                background: animateCart ? '#fff' : 'rgba(255,255,255,0.08)',
                color: animateCart ? '#0f172a' : '#fff',
                fontSize: '0.9rem',
                transition: 'all 0.2s ease',
                transform: animateCart ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              🛒
            </span>
            <span
              style={{
                minWidth: '1.25rem',
                height: '1.25rem',
                padding: '0 0.3rem',
                borderRadius: '999px',
                background: totalQuantity > 0 ? '#f59e0b' : 'rgba(255,255,255,0.12)',
                color: totalQuantity > 0 ? '#0f172a' : '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              {totalQuantity}
            </span>
          </Link>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginLeft: '0.25rem' }}>
              <span style={{ fontSize: '0.88rem', color: '#cbd5e1', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.user_metadata?.name ?? user.email}
              </span>
              <SignOutButton />
            </div>
          ) : (
            <Link
              href="/login"
              style={{
                color: '#0f172a',
                background: '#fff',
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.88rem',
              }}
            >
              Entrar
            </Link>
          )}
        </div>

        {/* Mobile Layout Right Side: Cart + Hamburger */}
        <div style={{ display: 'none', alignItems: 'center', gap: '0.85rem' }} className="menu-toggle-wrapper">
          <style>{`
            @media (max-width: 768px) {
              .menu-toggle-wrapper {
                display: flex !important;
              }
            }
          `}</style>
          
          <Link
            href="/carrinho"
            onClick={() => setMenuOpen(false)}
            style={{
              color: '#fff',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span
              aria-label="Carrinho"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '1.85rem',
                height: '1.85rem',
                borderRadius: '50%',
                background: animateCart ? '#fff' : 'rgba(255,255,255,0.08)',
                color: animateCart ? '#0f172a' : '#fff',
                fontSize: '0.9rem',
              }}
            >
              🛒
            </span>
            <span
              style={{
                minWidth: '1.25rem',
                height: '1.25rem',
                padding: '0 0.3rem',
                borderRadius: '999px',
                background: totalQuantity > 0 ? '#f59e0b' : 'rgba(255,255,255,0.12)',
                color: totalQuantity > 0 ? '#0f172a' : '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              {totalQuantity}
            </span>
          </Link>

          <button
            type="button"
            className="menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* Mobile Slide-down Menu */}
      <div className={`mobile-menu ${menuOpen ? 'open' : ''}`}>
        <Link 
          href="/eventos" 
          onClick={() => setMenuOpen(false)}
          style={{ color: '#fff', textDecoration: 'none', fontSize: '1rem', fontWeight: 500, padding: '0.5rem 0' }}
        >
          Eventos
        </Link>
        {user && (
          <Link 
            href="/meus-eventos" 
            onClick={() => setMenuOpen(false)}
            style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '1rem', fontWeight: 500, padding: '0.5rem 0' }}
          >
            Meus Eventos
          </Link>
        )}
        
        {user && (
          <Link
            href="/eventos/cadastrar"
            onClick={() => setMenuOpen(false)}
            style={{
              color: '#0f172a',
              background: '#a78bfa',
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.95rem',
              textAlign: 'center',
              marginTop: '0.5rem',
            }}
          >
            + Cadastrar Evento
          </Link>
        )}

        <div style={{ borderTop: '1px solid #1e293b', marginTop: '0.5rem', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.user_metadata?.name ?? user.email}
              </span>
              <div onClick={() => setMenuOpen(false)}>
                <SignOutButton />
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              style={{
                color: '#0f172a',
                background: '#fff',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.95rem',
                textAlign: 'center',
              }}
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </>
  )
}

'use client'

import Link from 'next/link'

export function Navbar() {
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
      </div>
    </nav>
  )
}

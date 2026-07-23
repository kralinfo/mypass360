'use client'

import Link from 'next/link'
import { useMyTickets } from '../hooks/useMyTickets'
import { TicketCard } from './TicketCard'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function MyTicketsPage() {
  const { tickets, isLoading, error } = useMyTickets()
  const [userName, setUserName] = useState<string | undefined>(undefined)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as Record<string, string> | undefined
      setUserName(meta?.full_name ?? meta?.name ?? data.user?.email)
    })
  }, [])

  return (
    <>
      <style>{`
        .my-tickets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1.25rem;
        }
        @media (max-width: 520px) {
          .my-tickets-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <main
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '1.5rem 1rem',
        }}
      >
        {/* Cabeçalho da página */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.02em',
              marginBottom: '0.35rem',
            }}
          >
            Meus Ingressos
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Gerencie e baixe todos os seus ingressos comprados.
          </p>
        </div>

        {/* Estado de carregamento */}
        {isLoading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4rem 1rem',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid #e2e8f0',
                borderTopColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Carregando seus ingressos...</p>
          </div>
        )}

        {/* Erro */}
        {!isLoading && error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '12px',
              padding: '1.25rem',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Estado vazio */}
        {!isLoading && !error && tickets.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '5rem 1rem',
              textAlign: 'center',
              gap: '1.25rem',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
              }}
            >
              🎫
            </div>
            <div>
              <h2
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  marginBottom: '0.5rem',
                }}
              >
                Você ainda não possui ingressos
              </h2>
              <p style={{ color: '#64748b', maxWidth: '360px', lineHeight: 1.6 }}>
                Explore os eventos disponíveis e adquira seus ingressos para que eles apareçam aqui.
              </p>
            </div>
            <Link
              href="/eventos"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.85rem 1.5rem',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                color: '#fff',
                borderRadius: '10px',
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: '0.95rem',
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                transition: 'opacity 0.15s ease',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Ver Eventos
            </Link>
          </div>
        )}

        {/* Grid de tickets */}
        {!isLoading && !error && tickets.length > 0 && (
          <>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              {tickets.length} {tickets.length === 1 ? 'ingresso encontrado' : 'ingressos encontrados'}
            </p>
            <div className="my-tickets-grid">
              {tickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} buyerName={userName} />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  )
}

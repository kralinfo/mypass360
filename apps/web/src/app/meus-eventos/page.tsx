'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useMyEvents } from '@/features/events/hooks/useMyEvents'
import { MyEventCard } from '@/features/events/components/MyEventCard'
import { BackButton } from '@/components/BackButton'

export default function MeusEventosPage() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const { events, isLoading, error, refetch } = useMyEvents()

  // Proteção no cliente — redireciona para login se não autenticado
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login?next=/meus-eventos')
      }
      setIsCheckingAuth(false)
    })
  }, [router])

  if (isCheckingAuth) {
    return (
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <p style={{ color: '#64748b', textAlign: 'center', marginTop: '4rem' }}>
          Verificando autenticação...
        </p>
      </main>
    )
  }

  return (
    <main
      style={{
        padding: '2rem',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <BackButton href="/eventos" style={{ marginBottom: '1rem' }} />

      {/* Cabeçalho */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#0f172a',
              margin: '0 0 0.25rem',
            }}
          >
            Meus Eventos
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>
            Gerencie os eventos que você criou
          </p>
        </div>

        <Link
          href="/eventos/cadastrar"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: '#0f172a',
            color: '#fff',
            padding: '0.6rem 1.25rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '0.9rem',
            transition: 'opacity 0.2s',
          }}
        >
          + Cadastrar Evento
        </Link>
      </div>

      {/* Estado de carregamento */}
      {isLoading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: '#f8fafc',
                borderRadius: '12px',
                height: '280px',
                border: '1px solid #e2e8f0',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      )}

      {/* Erro */}
      {error && !isLoading && (
        <div
          style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            padding: '1.5rem',
            color: '#856404',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: '0 0 1rem', fontWeight: 600 }}>Erro ao carregar eventos</p>
          <p style={{ margin: '0 0 1rem', fontSize: '0.875rem' }}>{error}</p>
          <button
            type="button"
            onClick={refetch}
            style={{
              background: '#ffc107',
              color: '#856404',
              border: 'none',
              padding: '0.5rem 1.5rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Estado vazio */}
      {!isLoading && !error && events.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎟️</div>
          <h2
            style={{
              fontSize: '1.25rem',
              color: '#0f172a',
              margin: '0 0 0.5rem',
              fontWeight: 600,
            }}
          >
            Você ainda não criou nenhum evento
          </h2>
          <p style={{ color: '#64748b', margin: '0 0 1.5rem', fontSize: '0.875rem' }}>
            Comece criando seu primeiro evento e gerencie as vendas de ingressos aqui.
          </p>
          <Link
            href="/eventos/cadastrar"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#0f172a',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '0.9rem',
            }}
          >
            Criar Evento
          </Link>
        </div>
      )}

      {/* Grade de eventos */}
      {!isLoading && !error && events.length > 0 && (
        <>
          <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            {events.length} evento{events.length !== 1 ? 's' : ''} encontrado{events.length !== 1 ? 's' : ''}
          </p>
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {events.map((event) => (
              <MyEventCard
                key={event.id}
                event={event}
                onStatusChange={refetch}
              />
            ))}
          </section>
        </>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </main>
  )
}

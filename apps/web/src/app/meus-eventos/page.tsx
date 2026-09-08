'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useMyEvents } from '@/features/events/hooks/useMyEvents'
import { MyEventCard } from '@/features/events/components/MyEventCard'
import { BackButton } from '@/components/BackButton'
import { AdminMessageDialogModal } from '@/features/events/components/AdminMessageDialogModal'
import { DeletionRejectedModal } from '@/features/events/components/DeletionRejectedModal'
import { replyAdminMessage } from '@/features/events/services/my-events.service'

function MeusEventosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlAdminMessage = searchParams.get('admin_message')
  const urlEventId = searchParams.get('event_id')
  const urlDeletionRejected = searchParams.get('deletion_rejected')
  const urlReason = searchParams.get('reason')

  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const { events, isLoading, error, refetch } = useMyEvents()

  const [search, setSearch] = useState('')
  const [activeAdminMessage, setActiveAdminMessage] = useState<string | null>(null)
  const [activeEventId, setActiveEventId] = useState<string | null>(null)
  const [activeDeletionRejectedEventId, setActiveDeletionRejectedEventId] = useState<string | null>(null)

  useEffect(() => {
    if (urlAdminMessage && urlEventId) {
      setActiveAdminMessage(urlAdminMessage)
      setActiveEventId(urlEventId)
    } else if (urlDeletionRejected && urlEventId) {
      setActiveDeletionRejectedEventId(urlEventId)
    }
  }, [urlAdminMessage, urlEventId, urlDeletionRejected])

  async function handleSendReply(replyMessage: string) {
    if (!activeEventId) return
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Sessão expirada. Faça login novamente.')
    await replyAdminMessage(activeEventId, session.access_token, replyMessage)
  }

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

  const filteredEvents = events.filter((ev) => {
    if (!search) return true
    return (
      ev.title.toLowerCase().includes(search.toLowerCase()) ||
      ev.location.toLowerCase().includes(search.toLowerCase())
    )
  })

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

      {/* Barra de Pesquisa */}
      {!isLoading && !error && events.length > 0 && (
        <div style={{ marginBottom: '1.5rem', maxWidth: '440px' }}>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              display: 'flex',
              pointerEvents: 'none'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Buscar entre meus eventos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 1rem 0.65rem 2.6rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                background: '#fff',
                color: '#0f172a',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#4f46e5')}
              onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
            />
          </div>
        </div>
      )}

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

      {/* Estado vazio original */}
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

      {/* Grade de eventos e busca sem resultados */}
      {!isLoading && !error && events.length > 0 && (
        <>
          {filteredEvents.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 2rem',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '12px',
              }}
            >
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
                Nenhum evento corresponde à busca &quot;<strong>{search}</strong>&quot;.
              </p>
            </div>
          ) : (
            <>
              <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                {filteredEvents.length} evento{filteredEvents.length !== 1 ? 's' : ''} encontrado{filteredEvents.length !== 1 ? 's' : ''}
              </p>
              <section
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '1.5rem',
                }}
              >
                {filteredEvents.map((event) => (
                  <MyEventCard
                    key={event.id}
                    event={event}
                    onStatusChange={refetch}
                  />
                ))}
              </section>
            </>
          )}
        </>
      )}

      {/* Modal de Mensagem da Administração */}
      {activeAdminMessage && activeEventId && (
        <AdminMessageDialogModal
          eventId={activeEventId}
          eventTitle={events.find((e) => e.id === activeEventId)?.title || 'Meu Evento'}
          adminMessage={activeAdminMessage}
          onSendReply={handleSendReply}
          onClose={() => {
            setActiveAdminMessage(null)
            setActiveEventId(null)
          }}
        />
      )}

      {/* Modal de Detalhes da Reprovação da Exclusão */}
      {activeDeletionRejectedEventId && (
        <DeletionRejectedModal
          eventId={activeDeletionRejectedEventId}
          eventTitle={events.find((e) => e.id === activeDeletionRejectedEventId)?.title || 'Meu Evento'}
          rejectionReason={
            urlReason ||
            events.find((e) => e.id === activeDeletionRejectedEventId)?.deletion_rejection_reason ||
            'Solicitação analisada e mantida pela administração.'
          }
          onSendReply={async (replyMessage) => {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) throw new Error('Sessão expirada. Faça login novamente.')
            await replyAdminMessage(activeDeletionRejectedEventId, session.access_token, replyMessage)
          }}
          onClose={() => {
            setActiveDeletionRejectedEventId(null)
          }}
        />
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

export default function MeusEventosPage() {
  return (
    <Suspense
      fallback={
        <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ color: '#64748b', textAlign: 'center', marginTop: '4rem' }}>Carregando...</p>
        </main>
      }
    >
      <MeusEventosContent />
    </Suspense>
  )
}

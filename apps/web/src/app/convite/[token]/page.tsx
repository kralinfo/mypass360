'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  fetchInviteByToken,
  acceptPartnerInvite,
  rejectPartnerInvite,
} from '@/features/events/services/my-events.service'

interface ConvitePageProps {
  params: Promise<{ token: string }>
}

export default function ConvitePage({ params }: ConvitePageProps) {
  const resolvedParams = use(params)
  const token = resolvedParams.token
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [inviteData, setInviteData] = useState<{
    invitation: {
      id: string
      event_id: string
      invited_email: string
      status: string
      created_at: string
      expires_at?: string | null
    }
    event: {
      id: string
      title: string
      date: string | null
      location: string | null
      banner_url: string | null
    }
  } | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function init() {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          // Se não estiver autenticado, redireciona para login guardando a rota de retorno
          router.push(`/login?next=/convite/${token}`)
          return
        }

        if (isMounted) {
          setUser({ id: session.user.id, email: session.user.email ?? '' })
          setAuthToken(session.access_token)
        }

        // Buscar dados do convite
        const data = await fetchInviteByToken(token)
        if (isMounted) {
          setInviteData(data)
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Não foi possível carregar as informações deste convite.'
          )
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void init()

    return () => {
      isMounted = false
    }
  }, [token, router])

  async function handleAccept() {
    if (!authToken) return
    setIsSubmitting(true)
    setError(null)

    try {
      await acceptPartnerInvite(token, authToken)
      setSuccessMessage('Convite aceito com sucesso! Redirecionando para Meus Eventos...')
      setTimeout(() => {
        router.push(`/meus-eventos?event_id=${inviteData?.event.id}&accepted=true`)
      }, 1500)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Falha ao aceitar convite. Tente novamente.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleReject() {
    if (!authToken) return
    if (!confirm('Deseja realmente recusar este convite?')) return

    setIsSubmitting(true)
    setError(null)

    try {
      await rejectPartnerInvite(token, authToken)
      setSuccessMessage('Convite recusado.')
      setTimeout(() => {
        router.push('/meus-eventos')
      }, 1500)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Falha ao recusar convite. Tente novamente.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSignOutAndSwitchAccount() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/login?next=/convite/${token}`)
  }

  if (isLoading) {
    return (
      <main
        style={{
          minHeight: '80vh',
          display: 'grid',
          placeItems: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ textAlign: 'center', color: '#6366f1' }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: '4px solid #e0e7ff',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem auto',
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontWeight: 600, color: '#4b5563' }}>Carregando dados do convite...</p>
        </div>
      </main>
    )
  }

  if (error && !inviteData) {
    return (
      <main style={{ minHeight: '80vh', display: 'grid', placeItems: 'center', padding: '2rem' }}>
        <div
          style={{
            maxWidth: 480,
            width: '100%',
            background: '#ffffff',
            borderRadius: 16,
            padding: '2.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            border: '1px solid #fee2e2',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.5rem' }}>
            Convite indisponível
          </h1>
          <p style={{ color: '#4b5563', marginBottom: '1.5rem', fontSize: '0.95rem' }}>{error}</p>
          <Link
            href="/meus-eventos"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              borderRadius: 8,
              background: '#4f46e5',
              color: '#fff',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Ir para Meus Eventos
          </Link>
        </div>
      </main>
    )
  }

  if (!inviteData) return null

  const { invitation, event } = inviteData
  const userEmail = user?.email?.trim().toLowerCase() ?? ''
  const invitedEmail = invitation.invited_email.trim().toLowerCase()
  const isEmailMismatch = userEmail !== invitedEmail

  return (
    <main
      style={{
        minHeight: '85vh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem 1rem',
        background: '#f8fafc',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: '100%',
          background: '#ffffff',
          borderRadius: 20,
          padding: '2rem',
          boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: '1.75rem',
              margin: '0 auto 1rem auto',
              boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
            }}
          >
            🤝
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Convite para Sócio de Evento
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Você foi convidado para colaborar na administração deste evento
          </p>
        </div>

        {/* Card do Evento */}
        <div
          style={{
            background: '#f8fafc',
            borderRadius: 12,
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '1.15rem', color: '#1e293b', marginBottom: '0.5rem' }}>
            {event.title}
          </div>
          {event.date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
              <span>📅</span> {new Date(event.date).toLocaleDateString('pt-BR', { dateStyle: 'full' })}
            </div>
          )}
          {event.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.875rem' }}>
              <span>📍</span> {event.location}
            </div>
          )}
        </div>

        {/* MENSAGEM DE SUCESSO */}
        {successMessage && (
          <div
            style={{
              padding: '1rem',
              borderRadius: 10,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              fontWeight: 600,
              textAlign: 'center',
              marginBottom: '1.5rem',
              fontSize: '0.95rem',
            }}
          >
            ✅ {successMessage}
          </div>
        )}

        {/* MENSAGEM DE ERRO */}
        {error && (
          <div
            style={{
              padding: '1rem',
              borderRadius: 10,
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              fontSize: '0.9rem',
              marginBottom: '1.5rem',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* BLOQUEIO DE SEGURANÇA: E-mail da conta diferente do convite */}
        {isEmailMismatch ? (
          <div
            style={{
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: 12,
              padding: '1.25rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ fontWeight: 700, color: '#be123c', fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔒</span> Este convite pertence a outra conta.
            </div>
            <p style={{ color: '#4c0519', fontSize: '0.875rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>
              O convite foi enviado para: <strong>{invitation.invited_email}</strong>
              <br />
              Conta atualmente conectada: <strong>{user?.email}</strong>
            </p>
            <p style={{ color: '#9f1239', fontSize: '0.825rem', marginBottom: '1rem', fontWeight: 500 }}>
              Entre com a conta correta correspondente ao e-mail do convite para poder aceitá-lo.
            </p>

            <button
              type="button"
              onClick={handleSignOutAndSignWithOther}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 8,
                background: '#be123c',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Sair e entrar com {invitation.invited_email}
            </button>
          </div>
        ) : invitation.status !== 'PENDING' ? (
          /* ESTADO JÁ PROCESSADO */
          <div
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: 12,
              padding: '1.25rem',
              textAlign: 'center',
              marginBottom: '1rem',
            }}
          >
            <p style={{ fontWeight: 600, color: '#334155', marginBottom: '1rem' }}>
              {invitation.status === 'ACCEPTED' && 'Este convite já foi aceito por você anteriormente!'}
              {invitation.status === 'CANCELLED' && 'Este convite foi cancelado pelo organizador.'}
              {invitation.status === 'EXPIRED' && 'Este convite expirou.'}
              {invitation.status === 'REJECTED' && 'Este convite foi recusado.'}
            </p>

            <Link
              href="/meus-eventos"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                borderRadius: 8,
                background: '#4f46e5',
                color: '#ffffff',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Ir para Meus Eventos
            </Link>
          </div>
        ) : (
          /* FLUXO NORMAL DE ACEITE */
          <div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem', background: '#f8fafc', padding: '0.75rem', borderRadius: 8, border: '1px stroke #e2e8f0' }}>
              Conectado como: <strong>{user?.email}</strong>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleReject}
                disabled={isSubmitting}
                style={{
                  padding: '0.875rem',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                }}
              >
                Recusar
              </button>

              <button
                type="button"
                onClick={handleAccept}
                disabled={isSubmitting}
                style={{
                  padding: '0.875rem',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
                }}
              >
                {isSubmitting ? 'Processando...' : 'Aceitar Convite'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )

  async function handleSignOutAndSignWithOther() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/login?next=/convite/${token}`)
  }
}

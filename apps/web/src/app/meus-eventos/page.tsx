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
import { OrganizerManualModal } from '@/features/events/components/OrganizerManualModal'
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
  const [isManualOpen, setIsManualOpen] = useState(false)
  const [manualInitialTab, setManualInitialTab] = useState<string>('criacao')
  const [isGuideMinimized, setIsGuideMinimized] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mypass360_guide_minimized')
      if (saved !== null) {
        return saved === 'true'
      }
    }
    return true // Por padrão, vem minimizado
  })

  const toggleGuideMinimized = () => {
    setIsGuideMinimized((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('mypass360_guide_minimized', String(next))
      }
      return next
    })
  }

  const openManualTab = (tabId: string) => {
    setManualInitialTab(tabId)
    setIsManualOpen(true)
  }

  useEffect(() => {
    if (urlAdminMessage && urlEventId) {
      setActiveAdminMessage(urlAdminMessage)
      setActiveEventId(urlEventId)
    } else if (urlDeletionRejected && urlEventId) {
      setActiveDeletionRejectedEventId(urlEventId)
    }
  }, [urlAdminMessage, urlEventId, urlDeletionRejected])

  useEffect(() => {
    if (urlEventId && events.length > 0) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`event-card-${urlEventId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.style.transition = 'all 0.4s ease'
          el.style.boxShadow = '0 0 0 4px #6366f1, 0 20px 25px -5px rgba(99, 102, 241, 0.25)'
          setTimeout(() => {
            el.style.boxShadow = ''
          }, 3500)
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [urlEventId, events])

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
          marginBottom: '1.5rem',
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

      {/* Central do Organizador - Guia de Recursos (Executive Command Dock com Minimizador) */}
      {isGuideMinimized ? (
        <div
          style={{
            background: 'linear-gradient(145deg, #050811 0%, #0f172a 100%)',
            borderRadius: '12px',
            padding: '0.85rem 1.4rem',
            marginBottom: '2rem',
            color: '#ffffff',
            border: '1px solid #1e293b',
            boxShadow: '0 10px 20px -5px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            </div>
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                Central de Operações MyPass360
              </span>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: '0.6rem' }}>
                Manual de Instruções do Organizador
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              onClick={() => openManualTab('criacao')}
              style={{
                background: '#ffffff',
                color: '#070a13',
                border: 'none',
                padding: '0.45rem 0.95rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff'
              }}
            >
              Abrir Manual
            </button>
            <button
              onClick={toggleGuideMinimized}
              title="Expandir Guia"
              aria-label="Expandir Guia"
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#334155'
                e.currentTarget.style.color = '#ffffff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#1e293b'
                e.currentTarget.style.color = '#cbd5e1'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: 'linear-gradient(145deg, #050811 0%, #0f172a 100%)',
            borderRadius: '16px',
            padding: '1.6rem 1.85rem',
            marginBottom: '2rem',
            color: '#ffffff',
            border: '1px solid #1e293b',
            boxShadow: '0 25px 35px -10px rgba(0, 0, 0, 0.4), 0 10px 15px -5px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: '#f8fafc',
                    background: '#1e293b',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                  </svg>
                  Central de Operações
                </span>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>Manual de Instruções do Organizador</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Guia Prático de Operação MyPass360
              </h3>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.45 }}>
                Passo a passo para cadastro, publicação, precificação, dados de repasse bancário e operação da portaria em tempo real.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => openManualTab('criacao')}
                style={{
                  background: '#ffffff',
                  color: '#070a13',
                  border: 'none',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(255, 255, 255, 0.12)',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f1f5f9'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                Abrir Manual Completo
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={toggleGuideMinimized}
                title="Minimizar Guia"
                aria-label="Minimizar Guia"
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#cbd5e1',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#334155'
                  e.currentTarget.style.color = '#ffffff'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1e293b'
                  e.currentTarget.style.color = '#cbd5e1'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Executive Action Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.85rem',
              paddingTop: '1.1rem',
              borderTop: '1px solid #1e293b',
            }}
          >
            {/* Card 1: Criação & Aprovação */}
            <button
              onClick={() => openManualTab('criacao')}
              style={{
                background: '#0d1527',
                border: '1px solid #1e293b',
                borderRadius: '10px',
                padding: '0.9rem 1rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#152138'
                e.currentTarget.style.borderColor = '#334155'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0d1527'
                e.currentTarget.style.borderColor = '#1e293b'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Passo 1 & 3</span>
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.2rem' }}>
                  Criação & Aprovação
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.35 }}>
                  Como cadastrar e enviar seu evento para análise e publicação oficial.
                </p>
              </div>
            </button>

            {/* Card 2: Ingressos & Taxas */}
            <button
              onClick={() => openManualTab('ingressos')}
              style={{
                background: '#0d1527',
                border: '1px solid #1e293b',
                borderRadius: '10px',
                padding: '0.9rem 1rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#152138'
                e.currentTarget.style.borderColor = '#334155'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0d1527'
                e.currentTarget.style.borderColor = '#1e293b'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z" />
                    <path d="M13 5v14" />
                  </svg>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Passo 2</span>
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.2rem' }}>
                  Ingressos & Regras
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.35 }}>
                  Categorias unitárias, taxas adicionais do comprador e reembolso nominal.
                </p>
              </div>
            </button>

            {/* Card 3: Repasse Financeiro */}
            <button
              onClick={() => openManualTab('financeiro')}
              style={{
                background: '#0d1527',
                border: '1px solid #1e293b',
                borderRadius: '10px',
                padding: '0.9rem 1rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#152138'
                e.currentTarget.style.borderColor = '#334155'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0d1527'
                e.currentTarget.style.borderColor = '#1e293b'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Passo 6</span>
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.2rem' }}>
                  Repasse Financeiro
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.35 }}>
                  Como cadastrar conta bancária, prazos pós-evento e taxas transparentes.
                </p>
              </div>
            </button>

            {/* Card 4: Portaria & Check-in */}
            <button
              onClick={() => openManualTab('checkin')}
              style={{
                background: '#0d1527',
                border: '1px solid #1e293b',
                borderRadius: '10px',
                padding: '0.9rem 1rem',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#152138'
                e.currentTarget.style.borderColor = '#334155'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0d1527'
                e.currentTarget.style.borderColor = '#1e293b'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Passo 5</span>
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.2rem' }}>
                  Portaria & Check-in
                </div>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0, lineHeight: 1.35 }}>
                  Ativação da portaria, código do operador, link direto e leitura QR.
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

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

      {/* Modal Interativo do Manual do Organizador */}
      <OrganizerManualModal
        isOpen={isManualOpen}
        initialTab={manualInitialTab}
        onClose={() => setIsManualOpen(false)}
      />

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

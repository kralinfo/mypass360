'use client'

import { createClient } from '@/lib/supabase/client'
import { getAdminSection } from '@/features/admin/admin.utils'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

const adminMenuItems = [
  { href: '/admin?sec=painel', secao: 'painel', label: 'Painel geral', icon: '⌂' },
  { href: '/admin?sec=indicadores', secao: 'indicadores', label: 'Indicadores', icon: '◫' },
  { href: '/admin?sec=eventos', secao: 'eventos', label: 'Eventos', icon: '◩' },
  { href: '/admin?sec=usuarios', secao: 'usuarios', label: 'Usuários', icon: '◪' },
]

function getTituloDaPagina(secao: string): string {
  switch (secao) {
    case 'indicadores':
      return 'Indicadores administrativos'
    case 'eventos':
      return 'Gestão de eventos'
    case 'usuarios':
      return 'Gestão de usuários'
    default:
      return 'Módulo administrativo'
  }
}

function getDescricaoDaPagina(secao: string): string {
  switch (secao) {
    case 'indicadores':
      return 'Resumo executivo e métricas operacionais do sistema.'
    case 'eventos':
      return 'Acompanhamento e operação da agenda de eventos.'
    case 'usuarios':
      return 'Controle administrativo de contas autenticadas.'
    default:
      return 'Acesso exclusivo do administrador.'
  }
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [usuario, setUsuario] = useState<User | null>(null)
  const [desktopMenuAberto, setDesktopMenuAberto] = useState(true)
  const [mobileMenuAberto, setMobileMenuAberto] = useState(false)

  const secaoAtiva = useMemo(() => getAdminSection(searchParams.get('sec')), [searchParams])
  const tituloDaPagina = useMemo(() => getTituloDaPagina(secaoAtiva), [secaoAtiva])
  const descricaoDaPagina = useMemo(() => getDescricaoDaPagina(secaoAtiva), [secaoAtiva])

  // Fechar o menu mobile ao navegar
  useEffect(() => {
    setMobileMenuAberto(false)
  }, [pathname, searchParams])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUsuario(data.user ?? null)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsuario(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin-login')
    router.refresh()
  }

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#f8fafc', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        /* Desktop */
        @media (min-width: 769px) {
          .admin-sidebar {
            position: sticky !important;
            top: 0 !important;
            height: 100vh !important;
            display: flex !important;
            flex-direction: column !important;
            justifyContent: space-between !important;
            flex-shrink: 0 !important;
            z-index: 30 !important;
          }
          .admin-backdrop {
            display: none !important;
          }
          .admin-mobile-toggle {
            display: none !important;
          }
        }

        /* Mobile */
        @media (max-width: 768px) {
          .admin-sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            height: 100vh !important;
            width: 260px !important;
            z-index: 1000 !important;
            display: flex !important;
            flex-direction: column !important;
            justifyContent: space-between !important;
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.35) !important;
            transform: translateX(-100%);
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          .admin-sidebar.mobile-open {
            transform: translateX(0) !important;
          }
          .admin-header-desc {
            display: none !important;
          }
          .admin-mobile-toggle {
            display: inline-flex !important;
          }
          .admin-header-container {
            padding: 0.5rem 0.85rem !important;
          }
        }
      `}</style>

      {/* Backdrop para fechar o menu mobile ao tocar fora */}
      {mobileMenuAberto && (
        <div
          className="admin-backdrop"
          onClick={() => setMobileMenuAberto(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 999,
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`admin-sidebar ${mobileMenuAberto ? 'mobile-open' : ''}`}
        style={{
          width: desktopMenuAberto ? '220px' : '62px',
          transition: 'width 0.22s ease',
          borderRight: '1px solid #e2e8f0',
          background: '#020617',
          color: '#fff',
          overflow: 'hidden',
        }}
      >
        <div>
          <div
            style={{
              padding: '0.75rem 0.85rem 0.65rem',
              borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: desktopMenuAberto ? 'space-between' : 'center',
              gap: '0.5rem',
            }}
          >
            {desktopMenuAberto || mobileMenuAberto ? (
              <div>
                <p style={{ margin: 0, fontSize: '0.72rem', letterSpacing: '0.08em', color: '#a78bfa', fontWeight: 700 }}>
                  MYPASS360
                </p>
                <strong style={{ display: 'block', marginTop: '0.2rem', fontSize: '0.9rem' }}>Administração</strong>
              </div>
            ) : null}

            {/* Botão de fechar/recolher sidebar */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth <= 768) {
                  setMobileMenuAberto(false)
                } else {
                  setDesktopMenuAberto((curr) => !curr)
                }
              }}
              style={{
                border: '1px solid rgba(148, 163, 184, 0.24)',
                background: 'rgba(148, 163, 184, 0.08)',
                color: '#fff',
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Recolher menu"
            >
              {mobileMenuAberto ? '✕' : '☰'}
            </button>
          </div>

          <nav style={{ display: 'grid', gap: '0.25rem', padding: '0.75rem 0.65rem' }}>
            {adminMenuItems.map((item) => {
              const ativo = pathname.startsWith('/admin') && item.secao === secaoAtiva

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuAberto(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.7rem',
                    textDecoration: 'none',
                    color: ativo ? '#fff' : '#cbd5e1',
                    background: ativo ? 'rgba(99, 102, 241, 0.22)' : 'transparent',
                    border: ativo ? '1px solid rgba(129, 140, 248, 0.32)' : '1px solid transparent',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    justifyContent: desktopMenuAberto || mobileMenuAberto ? 'flex-start' : 'center',
                  }}
                >
                  <span style={{ fontSize: '0.9rem', minWidth: '16px', textAlign: 'center' }}>{item.icon}</span>
                  {desktopMenuAberto || mobileMenuAberto ? <span>{item.label}</span> : null}
                </Link>
              )
            })}
          </nav>
        </div>

        <div style={{ padding: '0.65rem', borderTop: '1px solid rgba(148, 163, 184, 0.16)' }}>
          {desktopMenuAberto || mobileMenuAberto ? (
            <div
              style={{
                marginBottom: '0.65rem',
                padding: '0.65rem 0.75rem',
                borderRadius: '12px',
                background: 'rgba(148, 163, 184, 0.08)',
              }}
            >
              <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8' }}>Sessão ativa</span>
              <strong style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.83rem', wordBreak: 'break-word' }}>
                {usuario?.email ?? 'Administrador'}
              </strong>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void handleSignOut()}
            style={{
              width: '100%',
              border: '1px solid rgba(248, 113, 113, 0.32)',
              background: 'rgba(127, 29, 29, 0.15)',
              color: '#fecaca',
              borderRadius: '12px',
              padding: '0.65rem 0.75rem',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.83rem',
            }}
          >
            {desktopMenuAberto || mobileMenuAberto ? 'Sair da administração' : 'Sair'}
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            background: 'rgba(248, 250, 252, 0.92)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div
            className="admin-header-container"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              padding: '0.65rem 1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {/* Botão Hambúrguer Mobile */}
              <button
                type="button"
                className="admin-mobile-toggle"
                onClick={() => setMobileMenuAberto(true)}
                title="Abrir menu de navegação"
                style={{
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#0f172a',
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                ☰
              </button>

              <div>
                <span style={{ display: 'block', color: '#6366f1', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.08em' }}>
                  MÓDULO INTERNO
                </span>
                <strong style={{ display: 'block', marginTop: '0.15rem', color: '#0f172a', fontSize: '0.97rem' }}>
                  {tituloDaPagina}
                </strong>
              </div>
            </div>

            <span className="admin-header-desc" style={{ color: '#64748b', fontSize: '0.85rem' }}>
              {descricaoDaPagina}
            </span>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  )
}
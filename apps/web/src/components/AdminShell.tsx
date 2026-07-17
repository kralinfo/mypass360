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
  const [menuAberto, setMenuAberto] = useState(true)
  const secaoAtiva = useMemo(() => getAdminSection(searchParams.get('sec')), [searchParams])
  const tituloDaPagina = useMemo(() => getTituloDaPagina(secaoAtiva), [secaoAtiva])
  const descricaoDaPagina = useMemo(() => getDescricaoDaPagina(secaoAtiva), [secaoAtiva])

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
    <div style={{ minHeight: '100vh', display: 'flex', background: '#f8fafc' }}>
      <aside
        style={{
          width: menuAberto ? '280px' : '84px',
          transition: 'width 0.22s ease',
          borderRight: '1px solid #e2e8f0',
          background: '#020617',
          color: '#fff',
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        <div>
          <div
            style={{
              padding: '1rem 1rem 0.85rem',
              borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: menuAberto ? 'space-between' : 'center',
              gap: '0.75rem',
            }}
          >
            {menuAberto ? (
              <div>
                <p style={{ margin: 0, fontSize: '0.78rem', letterSpacing: '0.08em', color: '#a78bfa', fontWeight: 700 }}>
                  MYPASS360
                </p>
                <strong style={{ display: 'block', marginTop: '0.3rem', fontSize: '1rem' }}>Administração</strong>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setMenuAberto((valorAtual) => !valorAtual)}
              style={{
                border: '1px solid rgba(148, 163, 184, 0.24)',
                background: 'rgba(148, 163, 184, 0.08)',
                color: '#fff',
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '1.1rem',
              }}
              aria-label={menuAberto ? 'Recolher menu' : 'Expandir menu'}
            >
              ☰
            </button>
          </div>

          <nav style={{ display: 'grid', gap: '0.35rem', padding: '1rem 0.85rem' }}>
            {adminMenuItems.map((item) => {
              const ativo = pathname.startsWith('/admin') && item.secao === secaoAtiva

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    textDecoration: 'none',
                    color: ativo ? '#fff' : '#cbd5e1',
                    background: ativo ? 'rgba(99, 102, 241, 0.22)' : 'transparent',
                    border: ativo ? '1px solid rgba(129, 140, 248, 0.32)' : '1px solid transparent',
                    padding: '0.82rem 0.9rem',
                    borderRadius: '14px',
                    fontWeight: 600,
                    justifyContent: menuAberto ? 'flex-start' : 'center',
                  }}
                >
                  <span style={{ fontSize: '1rem', minWidth: '18px', textAlign: 'center' }}>{item.icon}</span>
                  {menuAberto ? <span>{item.label}</span> : null}
                </Link>
              )
            })}
          </nav>
        </div>

        <div style={{ padding: '0.85rem', borderTop: '1px solid rgba(148, 163, 184, 0.16)' }}>
          {menuAberto ? (
            <div
              style={{
                marginBottom: '0.85rem',
                padding: '0.9rem',
                borderRadius: '16px',
                background: 'rgba(148, 163, 184, 0.08)',
              }}
            >
              <span style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8' }}>Sessão ativa</span>
              <strong style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.92rem', wordBreak: 'break-word' }}>
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
              borderRadius: '14px',
              padding: '0.85rem 1rem',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {menuAberto ? 'Sair da administração' : 'Sair'}
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              padding: '1rem 1.5rem',
            }}
          >
            <div>
              <span style={{ display: 'block', color: '#6366f1', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.08em' }}>
                MÓDULO INTERNO
              </span>
              <strong style={{ display: 'block', marginTop: '0.25rem', color: '#0f172a', fontSize: '1.1rem' }}>
                {tituloDaPagina}
              </strong>
            </div>

            <span style={{ color: '#64748b', fontSize: '0.92rem' }}>{descricaoDaPagina}</span>
          </div>
        </header>

        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </div>
  )
}
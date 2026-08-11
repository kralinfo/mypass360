import { Suspense } from 'react'
import Link from 'next/link'
import { AdminLoginPage } from '@/features/auth/components/AdminLoginPage'

export default function AdminLogin() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'minmax(320px, 460px) minmax(360px, 1fr)',
        background: 'linear-gradient(135deg, #020617 0%, #111827 45%, #312e81 100%)',
      }}
    >
      <section
        style={{
          padding: '3rem',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '2rem',
        }}
      >
        <div>
          <p style={{ margin: 0, color: '#c4b5fd', fontWeight: 700, letterSpacing: '0.08em' }}>MY PASS 360</p>
          <h1 style={{ fontSize: '2.75rem', lineHeight: 1.1, margin: '1rem 0' }}>Acesso administrativo</h1>
          <p style={{ color: '#cbd5e1', fontSize: '1.05rem', maxWidth: '30rem' }}>
            Entre com email e senha para operar o painel interno, acompanhar vendas e gerenciar eventos.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gap: '1rem',
          }}
        >
          <div style={{ padding: '1rem', borderRadius: '16px', background: 'rgba(255,255,255,0.08)' }}>
            <strong>Fluxo separado do público</strong>
            <p style={{ margin: '0.5rem 0 0', color: '#cbd5e1' }}>
              Este acesso é voltado para operação, dashboard, pedidos e configuração de eventos.
            </p>
          </div>
          <div style={{ padding: '1rem', borderRadius: '16px', background: 'rgba(255,255,255,0.08)' }}>
            <strong>Login com credenciais internas</strong>
            <p style={{ margin: '0.5rem 0 0', color: '#cbd5e1' }}>
              Use a conta administrativa criada no Supabase com email e senha.
            </p>
          </div>
        </div>
      </section>

      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#f8fafc',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '460px',
            background: '#fff',
            borderRadius: '24px',
            padding: '2rem',
            boxShadow: '0 30px 80px rgba(15, 23, 42, 0.16)',
            border: '1px solid #e5e7eb',
          }}
        >
          <Suspense fallback={<div style={{ padding: '1rem', color: '#64748b' }}>Carregando...</div>}>
            <AdminLoginPage title="Entrar no painel" />
          </Suspense>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e5e7eb' }}>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>
              Voltar para o acesso do público?{' '}
              <Link href="/login" style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
                Entrar com Google
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
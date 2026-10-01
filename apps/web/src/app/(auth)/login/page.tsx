import Link from 'next/link'
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton'
import { BackButton } from '@/components/BackButton'

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams
  const registerHref = next ? `/cadastro?next=${encodeURIComponent(next)}` : '/cadastro'
  const backHref = next && next.startsWith('/') && !next.startsWith('//') ? next : '/eventos'

  return (
    <main
      style={{
        minHeight: 'calc(100vh - 140px)',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem 1rem',
      }}
    >
      <BackButton
        href={backHref}
        style={{ position: 'absolute', top: 'calc(6rem + env(safe-area-inset-top))', left: 'max(2rem, env(safe-area-inset-left))' }}
      />
      <section
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}
      >
        <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Entrar no MyPass360</h1>
        <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
          Acesse sua conta para comprar e gerenciar seus ingressos.
        </p>

        <GoogleSignInButton nextUrl={next} />

        <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
          Não tem conta? <Link href={registerHref}>Criar conta</Link>
        </p>
      </section>
    </main>
  )
}

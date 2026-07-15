import Link from 'next/link'
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton'
import { BackButton } from '@/components/BackButton'

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: 'calc(100vh - 140px)',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem 1rem',
      }}
    >
      <BackButton href="/eventos" style={{ position: 'absolute', top: '6rem', left: '2rem' }} />
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

        <GoogleSignInButton />

        <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
          Não tem conta? <Link href="/cadastro">Criar conta</Link>
        </p>
      </section>
    </main>
  )
}

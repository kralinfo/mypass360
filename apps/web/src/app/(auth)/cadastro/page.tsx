import Link from 'next/link'
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton'

export default function RegisterPage() {
  return (
    <main
      style={{
        minHeight: 'calc(100vh - 140px)',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem 1rem',
      }}
    >
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
        <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Criar conta</h1>
        <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
          Crie sua conta rapidamente usando Google.
        </p>

        <GoogleSignInButton label="Cadastrar com Google" />

        <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
          Já tem conta? <Link href="/login">Entrar</Link>
        </p>
      </section>
    </main>
  )
}

'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface AdminLoginPageProps {
  title?: string
}

export function AdminLoginPage({ title = 'Login administrativo' }: AdminLoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const labelStyle = {
    display: 'block',
    marginBottom: '0.45rem',
    color: '#334155',
    fontSize: '0.95rem',
    fontWeight: 600,
  } as const

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '0.9rem 1rem',
    fontSize: '1rem',
    color: '#0f172a',
    background: '#fff',
    outline: 'none',
  }

  const helperStyle = {
    margin: '0 0 1.5rem',
    color: '#64748b',
    fontSize: '0.98rem',
    lineHeight: 1.5,
  } as const

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setErrorMsg('Email ou senha incorretos. Verifique suas credenciais e tente novamente.')
      setLoading(false)
      return
    }

    // After successful login, redirect to the intended destination.
    // The middleware will reject non-admin accounts back to /admin-login.
    const next = searchParams.get('next') ?? '/admin'
    router.push(next)
    router.refresh()

    setLoading(false)
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 0.75rem', fontSize: '2rem', lineHeight: 1.1, color: '#0f172a' }}>{title}</h2>
      <p style={helperStyle}>Use seu usuário interno para acessar o ambiente administrativo do MyPass360.</p>

      {errorMsg && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.85rem 1rem',
          borderRadius: '12px',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          fontSize: '0.9rem',
          lineHeight: 1.45,
        }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle} htmlFor="admin-email">
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            required
            placeholder="admin@mypass360.com"
            style={inputStyle}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle} htmlFor="admin-password">
            Senha
          </label>
          <input
            id="admin-password"
            type="password"
            required
            placeholder="Digite sua senha"
            style={inputStyle}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            border: 'none',
            borderRadius: '14px',
            padding: '0.95rem 1.25rem',
            background: loading ? '#818cf8' : '#4f46e5',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 16px 30px rgba(79, 70, 229, 0.22)',
          }}
        >
          {loading ? 'Verificando...' : 'Entrar no painel'}
        </button>
      </form>
    </div>
  )
}
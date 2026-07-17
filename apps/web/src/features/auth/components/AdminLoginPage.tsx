'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface AdminLoginPageProps {
  title?: string
}

export function AdminLoginPage({ title = 'Login administrativo' }: AdminLoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      alert(`Erro ao autenticar: ${error.message}`)
    } else {
      router.push('/admin')
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 0.75rem', fontSize: '2rem', lineHeight: 1.1, color: '#0f172a' }}>{title}</h2>
      <p style={helperStyle}>Use seu usuário interno para acessar o ambiente administrativo do MyPass360.</p>

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle} htmlFor="email">
              Email
          </label>
          <input
            id="email"
            type="email"
            required
            placeholder="admin@mypass360.com"
            style={inputStyle}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle} htmlFor="password">
            Senha
          </label>
          <input
            id="password"
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
          {loading ? 'Entrando...' : 'Entrar no painel'}
        </button>
      </form>
    </div>
  )
}
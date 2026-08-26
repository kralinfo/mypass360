'use client'

import { useState } from 'react'
import { authenticateCheckinAccess } from '../checkin.service'
import type { CheckinAuthResponse } from '@mypass360/types'

interface CheckinAuthCardProps {
  initialCode?: string
  onAuthenticated: (data: CheckinAuthResponse) => void
}

export function CheckinAuthCard({ initialCode = '', onAuthenticated }: CheckinAuthCardProps) {
  const [code, setCode] = useState(initialCode)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await authenticateCheckinAccess(code.trim())
      onAuthenticated(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código de acesso inválido ou expirado.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        maxWidth: '440px',
        width: '100%',
        margin: '3rem auto',
        padding: '2rem',
        background: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.75rem',
          margin: '0 auto 1.25rem',
          boxShadow: '0 8px 16px -4px rgba(79, 70, 229, 0.3)',
        }}
      >
        📲
      </div>

      <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>
        Portaria & Check-in
      </h1>
      <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5, margin: '0 0 1.75rem' }}>
        Digite o código de acesso fornecido pela administração do evento para iniciar a validação de ingressos.
      </p>

      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.25rem',
            textAlign: 'left',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <input
            type="text"
            required
            autoFocus
            placeholder="Ex: CKIN-8A2F9C1E"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              borderRadius: '12px',
              border: '2px solid #cbd5e1',
              fontSize: '1.1rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textAlign: 'center',
              fontFamily: 'monospace',
              outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#4f46e5'
              e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.15)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#cbd5e1'
              e.target.style.boxShadow = 'none'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !code.trim()}
          style={{
            padding: '0.875rem 1.5rem',
            borderRadius: '12px',
            border: 'none',
            background: isLoading || !code.trim() ? '#94a3b8' : '#0f172a',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '1rem',
            cursor: isLoading || !code.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s, transform 0.1s',
          }}
        >
          {isLoading ? 'Conectando...' : 'Acessar Terminal de Portaria →'}
        </button>
      </form>
    </div>
  )
}

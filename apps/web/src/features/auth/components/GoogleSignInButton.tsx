'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface GoogleSignInButtonProps {
  label?: string
}

export function GoogleSignInButton({ label = 'Continuar com Google' }: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleGoogleLogin() {
    setIsLoading(true)

    const supabase = createClient()
    const next = new URLSearchParams(window.location.search).get('next') ?? '/eventos'
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      setIsLoading(false)
      alert(`Erro ao autenticar com Google: ${error.message}`)
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={isLoading}
      style={{
        width: '100%',
        padding: '0.875rem 1rem',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        background: '#fff',
        color: '#111827',
        fontWeight: 600,
        cursor: isLoading ? 'not-allowed' : 'pointer',
      }}
    >
      {isLoading ? 'Conectando...' : label}
    </button>
  )
}

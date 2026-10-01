'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface GoogleSignInButtonProps {
  label?: string
  nextUrl?: string
}

function getSafeNextUrl(rawNext: string | null): string | null {
  if (!rawNext) return null
  if (rawNext.startsWith('/') && !rawNext.startsWith('//')) {
    return rawNext
  }
  return null
}

export function GoogleSignInButton({ label = 'Continuar com Google', nextUrl }: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleGoogleLogin() {
    setIsLoading(true)

    const supabase = createClient()

    // Hierarquia para determinar a rota de retorno pós-login:
    // 1. Prop explicita `nextUrl`
    // 2. Query param `?next=` na URL atual (incluindo parâmetros de query codificados)
    // 3. Referrer (se for da mesma aplicação e não for página de auth)
    // 4. Fallback padrão: `/eventos`
    const searchNext = getSafeNextUrl(new URLSearchParams(window.location.search).get('next'))

    let referrerNext: string | null = null
    if (typeof window !== 'undefined' && document.referrer) {
      try {
        const refUrl = new URL(document.referrer)
        if (refUrl.origin === window.location.origin) {
          const path = refUrl.pathname + refUrl.search
          if (!path.startsWith('/login') && !path.startsWith('/cadastro') && !path.startsWith('/admin-login')) {
            referrerNext = getSafeNextUrl(path)
          }
        }
      } catch {
        // Silencioso
      }
    }

    const targetNext = nextUrl ?? searchNext ?? referrerNext ?? '/eventos'
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(targetNext)}`

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

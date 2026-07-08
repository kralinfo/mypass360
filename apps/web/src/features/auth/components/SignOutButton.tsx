'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSignOut() {
    setIsLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isLoading}
      style={{
        border: '1px solid #fff',
        color: '#fff',
        background: 'transparent',
        padding: '0.45rem 0.85rem',
        borderRadius: '6px',
        cursor: isLoading ? 'not-allowed' : 'pointer',
      }}
    >
      {isLoading ? 'Saindo...' : 'Sair'}
    </button>
  )
}

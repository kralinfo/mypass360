'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { CheckinAuthResponse } from '@mypass360/types'
import { authenticateCheckinAccess } from '@/features/checkin/checkin.service'
import { CheckinAuthCard } from '@/features/checkin/components/CheckinAuthCard'
import { CheckinTerminal } from '@/features/checkin/components/CheckinTerminal'

const STORAGE_KEY = 'mypass360_checkin_session'

function CheckinContent() {
  const searchParams = useSearchParams()
  const urlCode = searchParams.get('code') ?? ''

  const [authData, setAuthData] = useState<CheckinAuthResponse | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    async function init() {
      // 1. Tenta autenticar pelo código da URL se fornecido
      if (urlCode) {
        try {
          const res = await authenticateCheckinAccess(urlCode)
          setAuthData(res)
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(res))
          setIsInitializing(false)
          return
        } catch {
          // Continua para tentar restaurar sessão salva
        }
      }

      // 2. Tenta restaurar sessão salva no sessionStorage
      try {
        const saved = window.sessionStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved) as CheckinAuthResponse
          // Re-valida a sessão com o servidor
          const res = await authenticateCheckinAccess(parsed.access.code)
          setAuthData(res)
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(res))
        }
      } catch {
        window.sessionStorage.removeItem(STORAGE_KEY)
      } finally {
        setIsInitializing(false)
      }
    }

    init()
  }, [urlCode])

  const handleAuthenticated = (data: CheckinAuthResponse) => {
    setAuthData(data)
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  const handleLogout = () => {
    setAuthData(null)
    window.sessionStorage.removeItem(STORAGE_KEY)
  }

  if (isInitializing) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '3px solid #e2e8f0',
            borderTopColor: '#4f46e5',
            animation: 'ck-spin 0.7s linear infinite',
            margin: '0 auto 1rem',
          }}
        />
        <p style={{ fontWeight: 600 }}>Iniciando terminal de portaria...</p>
        <style>{`@keyframes ck-spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: '1.5rem 1rem' }}>
      {authData ? (
        <CheckinTerminal authData={authData} onLogout={handleLogout} />
      ) : (
        <CheckinAuthCard initialCode={urlCode} onAuthenticated={handleAuthenticated} />
      )}
    </main>
  )
}

export default function CheckinPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
          <p>Carregando portaria...</p>
        </div>
      }
    >
      <CheckinContent />
    </Suspense>
  )
}

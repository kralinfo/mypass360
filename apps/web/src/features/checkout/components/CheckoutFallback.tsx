'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function CheckoutFallback() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(true)

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return

      // 1. Verificar se há algum pagamento pendente recente com eventId
      //    Checar sessionStorage primeiro, depois localStorage (persiste entre abas/apps)
      const pendingRaw =
        window.sessionStorage.getItem('mypass360-pending-payment')
        ?? window.localStorage.getItem('mypass360-pending-payment')
      if (pendingRaw) {
        const parsed = JSON.parse(pendingRaw)
        if (parsed.eventId) {
          const params = new URLSearchParams({ eventId: parsed.eventId })
          if (parsed.slug) params.append('slug', parsed.slug)
          if (parsed.from) params.append('from', parsed.from)
          router.replace(`/checkout?${params.toString()}`)
          return
        }
      }

      // 2. Procurar por qualquer order-meta recente (session + local)
      const allKeys = [
        ...Object.keys(window.sessionStorage),
        ...Object.keys(window.localStorage),
      ]
      for (const key of allKeys) {
        if (key.startsWith('mypass360-order-meta:')) {
          const raw =
            window.sessionStorage.getItem(key)
            ?? window.localStorage.getItem(key)
          if (raw) {
            const meta = JSON.parse(raw)
            if (meta.eventId) {
              const params = new URLSearchParams({ eventId: meta.eventId })
              if (meta.slug) params.append('slug', meta.slug)
              if (meta.from) params.append('from', meta.from)
              router.replace(`/checkout?${params.toString()}`)
              return
            }
          }
        }
      }

      // 3. Procurar por qualquer snapshot recente
      for (const key of Object.keys(window.sessionStorage)) {
        if (key.startsWith('mypass360-checkout-snapshot:')) {
          const parts = key.split(':')
          const id = parts[1]
          if (id) {
            router.replace(`/checkout?eventId=${id}`)
            return
          }
        }
      }
    } catch {
      // ignore
    }

    setIsRedirecting(false)
  }, [router])

  if (isRedirecting) {
    return (
      <main style={{ padding: '3rem 1rem', maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Restaurando suas informações de pedido...</p>
      </main>
    )
  }

  return (
    <main style={{ padding: '3rem 1rem', maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '0.75rem', color: '#0f172a' }}>Nenhum pedido selecionado</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.5 }}>
        Não encontramos informações de pedido ativas. Escolha um evento na listagem para continuar.
      </p>
      <Link
        href="/eventos"
        style={{
          display: 'inline-flex',
          padding: '0.75rem 1.5rem',
          borderRadius: '10px',
          background: '#0f172a',
          color: '#fff',
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        Ver Eventos
      </Link>
    </main>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchPaymentByOrderId, syncPaymentStatus } from '@/features/checkout/services/payment.service'
import { useMyTickets } from '../hooks/useMyTickets'

const STORAGE_KEY = 'mypass360-pending-payment'
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24h

interface PendingEntry {
  orderId: string
  initiatedAt: string
}

/**
 * Detecta se o usuário tem um pagamento PIX pendente (salvo antes de ir ao Mercado Pago)
 * e fica checando automaticamente. Quando o pagamento é aprovado, refetch os ingressos
 * e remove o banner.
 */
export function PendingPaymentBanner({ refetch }: { refetch: () => void }) {
  const router = useRouter()
  const [orderId, setOrderId] = useState<string | null>(null)
  const [status, setStatus] = useState<'checking' | 'pending' | 'approved' | 'notfound'>('checking')
  const [dismissed, setDismissed] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Ler sessionStorage na montagem
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return

      const entry = JSON.parse(raw) as PendingEntry

      // Expirar após 24h
      const age = Date.now() - new Date(entry.initiatedAt).getTime()
      if (age > MAX_AGE_MS) {
        window.sessionStorage.removeItem(STORAGE_KEY)
        return
      }

      setOrderId(entry.orderId)
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  // Quando temos um orderId, iniciar verificação
  useEffect(() => {
    if (!orderId) return

    let cancelled = false

    async function checkOnce() {
      try {
        const payment = await fetchPaymentByOrderId(orderId!)
        if (cancelled) return

        if (!payment) {
          setStatus('notfound')
          return
        }

        if (payment.status === 'approved') {
          handleApproved()
          return
        }

        // Pendente — iniciar polling ativo com sync
        setStatus('pending')
        pollRef.current = setInterval(async () => {
          try {
            const updated = await syncPaymentStatus(payment.id)
            if (cancelled) return
            if (updated.status === 'approved') {
              handleApproved()
            }
          } catch {
            // ignora erros transientes
          }
        }, 5000)
      } catch {
        if (!cancelled) setStatus('notfound')
      }
    }

    checkOnce()

    return () => {
      cancelled = true
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [orderId])

  function handleApproved() {
    setStatus('approved')
    window.sessionStorage.removeItem(STORAGE_KEY)
    if (pollRef.current) clearInterval(pollRef.current)
    // Recarregar ingressos
    refetch()
  }

  // Nada para mostrar
  if (!orderId || dismissed || status === 'notfound') return null

  // Aprovado — breve banner de sucesso, some em 4s
  if (status === 'approved') {
    setTimeout(() => setDismissed(true), 4000)
    return (
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        border: '1px solid #86efac',
        borderRadius: '14px',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        animation: 'pib-fadeIn 0.4s ease',
      }}>
        <span style={{ fontSize: '1.6rem' }}>✅</span>
        <div>
          <p style={{ fontWeight: 800, color: '#15803d', margin: 0 }}>Pagamento aprovado!</p>
          <p style={{ fontSize: '0.85rem', color: '#166534', margin: '2px 0 0' }}>
            Seu ingresso foi gerado e já aparece abaixo.
          </p>
        </div>
        <style>{`@keyframes pib-fadeIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }`}</style>
      </div>
    )
  }

  // Pendente — banner de verificação contínua
  return (
    <div style={{
      background: 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)',
      border: '1px solid #93c5fd',
      borderRadius: '14px',
      padding: '1rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      marginBottom: '1.5rem',
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%',
          border: '2.5px solid #93c5fd', borderTopColor: '#3b82f6',
          animation: 'pib-spin 0.7s linear infinite', flexShrink: 0,
        }} />
        <div>
          <p style={{ fontWeight: 700, color: '#1d4ed8', margin: 0, fontSize: '0.95rem' }}>
            Verificando seu pagamento PIX...
          </p>
          <p style={{ color: '#3b82f6', fontSize: '0.8rem', margin: '2px 0 0' }}>
            Detectamos um pagamento pendente. Assim que confirmado, seu ingresso aparecerá aqui automaticamente.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => router.push(`/checkout/pagamento?orderId=${orderId}&eventId=&amount=0`)}
          style={{
            padding: '0.5rem 0.875rem', borderRadius: '8px',
            border: '1px solid #93c5fd', background: '#fff',
            color: '#1d4ed8', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Ver pagamento
        </button>
        <button
          type="button"
          onClick={() => { setDismissed(true); window.sessionStorage.removeItem(STORAGE_KEY) }}
          style={{
            padding: '0.5rem 0.875rem', borderRadius: '8px',
            border: '1px solid #d1d5db', background: '#fff',
            color: '#6b7280', fontSize: '0.8rem', cursor: 'pointer',
          }}
        >
          Dispensar
        </button>
      </div>
      <style>{`@keyframes pib-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

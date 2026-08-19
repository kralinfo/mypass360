'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Payment } from '@mypass360/types'
import { createClient } from '@/lib/supabase/client'
import {
  confirmPayment,
  createCheckoutPreference,
  fetchPaymentById,
  fetchPaymentByOrderId,
  manualConfirmPayment,
  syncPaymentStatus,
} from '../services/payment.service'
import { useCart } from '@/features/cart/cart-context'

interface PaymentStatusCardProps {
  paymentId?: string
  orderId: string
  eventId: string
  amount: number
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid #e2e8f0', borderTopColor: '#6366f1',
        animation: 'psc-spin 0.7s linear infinite',
        margin: '0 auto 1rem',
      }} />
      <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Carregando pagamento...</p>
      <style>{`@keyframes psc-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ─── Polling indicator (awaiting PIX) ──────────────────────────────────────────
function AwaitingPaymentBanner() {
  const [dots, setDots] = useState('.')
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 600)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{
      background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
      border: '1px solid #bfdbfe',
      borderRadius: '12px',
      padding: '1rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        border: '2px solid #93c5fd', borderTopColor: '#3b82f6',
        animation: 'psc-spin 0.7s linear infinite',
        flexShrink: 0,
      }} />
      <div>
        <p style={{ fontWeight: 700, color: '#1d4ed8', fontSize: '0.9rem', margin: 0 }}>
          Verificando seu pagamento{dots}
        </p>
        <p style={{ color: '#3b82f6', fontSize: '0.8rem', margin: '2px 0 0' }}>
          Atualizando automaticamente a cada 5 segundos
        </p>
      </div>
    </div>
  )
}

// ─── Success banner ────────────────────────────────────────────────────────────
function SuccessBanner() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      border: '1px solid #86efac',
      borderRadius: '12px',
      padding: '1rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      animation: 'psc-fadeIn 0.4s ease',
    }}>
      <span style={{ fontSize: '1.8rem' }}>✅</span>
      <div>
        <p style={{ fontWeight: 800, color: '#15803d', fontSize: '1rem', margin: 0 }}>
          Pagamento aprovado!
        </p>
        <p style={{ fontSize: '0.85rem', color: '#166534', margin: '3px 0 0' }}>
          Seus ingressos foram gerados. Redirecionando para{' '}
          <Link href="/meus-ingressos" style={{ color: '#15803d', fontWeight: 700 }}>
            Meus Ingressos
          </Link>
          ...
        </p>
      </div>
      <style>{`@keyframes psc-fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  )
}

export function PaymentStatusCard({ paymentId, orderId, eventId, amount }: PaymentStatusCardProps) {
  const router = useRouter()
  const { clearCart } = useCart()

  const [payment, setPayment] = useState<Payment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // TODO: Remover quando a integração oficial do Mercado Pago estiver concluída.
  const [manualCode, setManualCode] = useState('')
  const [isManualConfirming, setIsManualConfirming] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)

  // Ref for polling interval cleanup
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Success handler (shared) ──────────────────────────────────────────────
  const handleApproved = useCallback((approved: Payment) => {
    setPayment(approved)
    clearCart()
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    setTimeout(() => router.push('/meus-ingressos'), 2000)
  }, [clearCart, router])

  // ── Start polling — usa syncPaymentStatus que consulta MP ativamente ────
  const startPolling = useCallback((pid: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        // POST /payments/:id/sync → backend consulta API do MP em tempo real
        // Se o MP diz "approved", o backend confirma, gera ingressos e retorna
        const data = await syncPaymentStatus(pid)
        setPayment(data)
        if (data.status === 'approved') {
          handleApproved(data)
        }
      } catch {
        // silently ignore transient errors
      }
    }, 5000)
  }, [handleApproved])

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        let found: Payment | null = null

        if (paymentId) {
          // Flow 1: came with explicit paymentId (PIX direto / pendente relembrado)
          found = await fetchPaymentById(paymentId)
        } else {
          // Flow 2: returned from Mercado Pago Checkout Pro (only orderId in URL)
          found = await fetchPaymentByOrderId(orderId)
        }

        if (cancelled) return

        setPayment(found)

        if (found?.status === 'approved') {
          // Already approved (e.g. user refreshed after paying)
          handleApproved(found)
        } else if (found?.status === 'pending' && found.id) {
          // Pending — start automatic polling
          startPolling(found.id)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar pagamento')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [paymentId, orderId, handleApproved, startPolling])

  // ── Create new Checkout Pro preference ───────────────────────────────────
  async function handleCreatePayment() {
    setIsCreating(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.email) {
        setError('Você precisa estar logado com um e-mail válido para gerar o pagamento.')
        return
      }

      const preference = await createCheckoutPreference({
        orderId,
        amount,
        payerEmail: user.email,
      })

      window.location.href = preference.initPoint
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar pagamento')
    } finally {
      setIsCreating(false)
    }
  }

  // TODO: Remover quando a integração oficial do Mercado Pago estiver concluída.
  async function handleManualConfirm() {
    setIsManualConfirming(true)
    setManualError(null)

    try {
      const updated = await manualConfirmPayment(orderId, manualCode)
      setManualCode('')
      handleApproved(updated)
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'Erro na confirmação manual')
    } finally {
      setIsManualConfirming(false)
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) return <LoadingState />

  // ── No payment yet ────────────────────────────────────────────────────────
  if (!payment) {
    return (
      <section style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '14px',
        padding: '1.5rem',
        display: 'grid',
        gap: '1rem',
      }}>
        <div>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 2px' }}>Pedido</p>
          <strong style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{orderId}</strong>
        </div>

        <div>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 2px' }}>Total a pagar</p>
          <strong style={{ fontSize: '1.1rem' }}>
            {amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </strong>
        </div>

        <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.6 }}>
          Ao continuar, você será redirecionado para o ambiente seguro do Mercado Pago, onde poderá
          escolher entre PIX, cartão de crédito, boleto e outros meios disponíveis.
        </p>

        {error && <p style={{ color: '#dc2626', fontWeight: 600 }}>{error}</p>}

        <button
          type="button"
          onClick={handleCreatePayment}
          disabled={isCreating}
          style={{
            padding: '0.875rem 1rem',
            borderRadius: '10px',
            border: 'none',
            background: isCreating ? '#94a3b8' : '#0f172a',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: isCreating ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {isCreating ? 'Redirecionando...' : 'Continuar para pagamento'}
        </button>

        {/* TODO: Remover quando a integração oficial do Mercado Pago estiver concluída. */}
        <ManualConfirmationBox
          orderId={orderId}
          manualCode={manualCode}
          setManualCode={setManualCode}
          isManualConfirming={isManualConfirming}
          manualError={manualError}
          onConfirm={handleManualConfirm}
        />
      </section>
    )
  }

  // ── Payment exists ────────────────────────────────────────────────────────
  const isPending = payment.status === 'pending'
  const isApproved = payment.status === 'approved'

  return (
    <section style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '14px',
      padding: '1.5rem',
      display: 'grid',
      gap: '1rem',
    }}>
      {/* Order + Amount row */}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ color: '#6b7280', fontSize: '0.82rem', margin: '0 0 2px' }}>Pedido</p>
          <strong style={{ fontFamily: 'monospace', fontSize: '0.87rem' }}>{orderId}</strong>
        </div>
        <div>
          <p style={{ color: '#6b7280', fontSize: '0.82rem', margin: '0 0 2px' }}>Valor</p>
          <strong>{payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </div>
        <div>
          <p style={{ color: '#6b7280', fontSize: '0.82rem', margin: '0 0 2px' }}>Status</p>
          <strong style={{ color: isApproved ? '#15803d' : '#b45309' }}>
            {isApproved ? 'Aprovado' : 'Aguardando pagamento'}
          </strong>
        </div>
      </div>

      {/* PIX code (if present) */}
      {payment.pixCode && isPending && (
        <div>
          <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
            Código PIX copia e cola
          </p>
          <textarea
            readOnly
            value={payment.pixCode}
            style={{
              width: '100%',
              minHeight: '100px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              padding: '0.75rem',
              fontFamily: 'monospace',
              fontSize: '0.78rem',
              resize: 'none',
              background: '#f8fafc',
            }}
          />
        </div>
      )}

      {payment.pixExpiresAt && isPending && (
        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
          ⏱ Expira em: {new Date(payment.pixExpiresAt).toLocaleString('pt-BR')}
        </p>
      )}

      {error && <p style={{ color: '#dc2626', fontWeight: 600 }}>{error}</p>}

      {/* Auto-polling indicator */}
      {isPending && <AwaitingPaymentBanner />}

      {/* Success banner */}
      {isApproved && <SuccessBanner />}

      {/* TODO: Remover quando a integração oficial do Mercado Pago estiver concluída. */}
      {isPending && (
        <ManualConfirmationBox
          orderId={orderId}
          manualCode={manualCode}
          setManualCode={setManualCode}
          isManualConfirming={isManualConfirming}
          manualError={manualError}
          onConfirm={handleManualConfirm}
        />
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {!isApproved && (
          <Link
            href={`/checkout?eventId=${eventId}`}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              color: '#374151',
              textDecoration: 'none',
              fontSize: '0.875rem',
            }}
          >
            Voltar ao checkout
          </Link>
        )}
        <Link
          href="/eventos"
          style={{
            padding: '0.65rem 1rem',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            color: '#374151',
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}
        >
          Ver eventos
        </Link>
      </div>
    </section>
  )
}

// ─── Manual confirmation sub-component (dev only) ─────────────────────────────
// TODO: Remover quando a integração oficial do Mercado Pago estiver concluída.
function ManualConfirmationBox({
  orderId,
  manualCode,
  setManualCode,
  isManualConfirming,
  manualError,
  onConfirm,
}: {
  orderId: string
  manualCode: string
  setManualCode: (v: string) => void
  isManualConfirming: boolean
  manualError: string | null
  onConfirm: () => void
}) {
  return (
    <div style={{
      background: '#fefce8',
      border: '1px dashed #fbbf24',
      borderRadius: '10px',
      padding: '1rem',
      display: 'grid',
      gap: '0.75rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>🛠️</span>
        <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e', margin: 0 }}>
          Confirmação Manual — Somente Desenvolvimento
        </p>
      </div>
      <p style={{ fontSize: '0.78rem', color: '#78350f', lineHeight: 1.5, margin: 0 }}>
        Pedido: <code style={{ fontFamily: 'monospace' }}>{orderId}</code><br />
        Insira o código para simular a aprovação e gerar os ingressos automaticamente.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          placeholder="Código de confirmação"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          style={{
            flex: 1,
            padding: '0.6rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid #fbbf24',
            background: '#fff',
            fontSize: '0.875rem',
            fontFamily: 'monospace',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={onConfirm}
          disabled={isManualConfirming || !manualCode.trim()}
          style={{
            padding: '0.6rem 1rem',
            borderRadius: '8px',
            border: 'none',
            background: '#d97706',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: isManualConfirming || !manualCode.trim() ? 'not-allowed' : 'pointer',
            opacity: isManualConfirming || !manualCode.trim() ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {isManualConfirming ? 'Confirmando...' : 'Confirmar'}
        </button>
      </div>
      {manualError && (
        <p style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>{manualError}</p>
      )}
    </div>
  )
}

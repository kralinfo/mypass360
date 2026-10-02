'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Payment } from '@mypass360/types'
import { createClient } from '@/lib/supabase/client'
import {
  createCheckoutPreference,
  fetchPaymentById,
  fetchPaymentByOrderId,
  syncPaymentStatus,
} from '../services/payment.service'
import { useCart } from '@/features/cart/cart-context'
import { FeeRefundDisclaimer } from './FeeRefundDisclaimer'

interface PaymentStatusCardProps {
  paymentId?: string
  orderId: string
  eventId: string
  amount: number
  from?: string
  slug?: string
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

export function PaymentStatusCard({ paymentId, orderId, eventId, amount, from, slug }: PaymentStatusCardProps) {
  const router = useRouter()
  const { clearCart } = useCart()

  const [payment, setPayment] = useState<Payment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [resolvedEventId, setResolvedEventId] = useState(eventId)
  const [resolvedSlug, setResolvedSlug] = useState(slug)
  const [resolvedFrom, setResolvedFrom] = useState(from)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      if (orderId) {
        const storedMeta = window.sessionStorage.getItem(`mypass360-order-meta:${orderId}`)
        if (storedMeta) {
          const meta = JSON.parse(storedMeta)
          if (meta.eventId) setResolvedEventId(meta.eventId)
          if (meta.slug) setResolvedSlug(meta.slug)
          if (meta.from) setResolvedFrom(meta.from)
          return
        }
      }

      const pending = window.sessionStorage.getItem('mypass360-pending-payment')
      if (pending) {
        const parsed = JSON.parse(pending)
        if (parsed.eventId) setResolvedEventId(parsed.eventId)
        if (parsed.slug) setResolvedSlug(parsed.slug)
        if (parsed.from) setResolvedFrom(parsed.from)
      }
    } catch {
      // ignore
    }
  }, [orderId, eventId, slug, from])

  // Aviso mobile antes de ir para o Mercado Pago
  const [showMobileWarning, setShowMobileWarning] = useState(false)

  const isMobileDevice = () =>
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || window.innerWidth < 768)

  const handlePayClick = () => {
    if (isMobileDevice()) {
      setShowMobileWarning(true)
    } else {
      void handleCreateCheckoutPreference()
    }
  }

  // Ref for polling interval cleanup
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Ref para a aba do Mercado Pago aberta via popup (Checkout Pro) — fechada automaticamente ao aprovar
  const mpPopupRef = useRef<Window | null>(null)

  // ── Success handler (shared) ──────────────────────────────────────────────
  const handleApproved = useCallback((approved: Payment) => {
    setPayment(approved)
    clearCart()
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    // Fecha automaticamente a aba nativa do Mercado Pago, se ainda estiver aberta
    if (mpPopupRef.current && !mpPopupRef.current.closed) {
      mpPopupRef.current.close()
      mpPopupRef.current = null
    }
    // Apagar snapshot de seleção — pagamento aprovado, não há mais necessidade de restaurar
    try {
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith('mypass360-checkout-snapshot:')) {
          sessionStorage.removeItem(key)
        }
      }
    } catch { /* silencioso */ }
    setTimeout(() => router.push('/meus-ingressos'), 1200)
  }, [clearCart, router])

  // ── Start polling — usa syncPaymentStatus que consulta MP ativamente ────
  const startPolling = useCallback((pid: string) => {
    if (pollRef.current) clearInterval(pollRef.current)

    const check = async () => {
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
    }

    // Verifica imediatamente (não espera o primeiro intervalo) para reduzir a percepção de espera
    check()
    pollRef.current = setInterval(check, 3000)
  }, [handleApproved])

  // ── Verifica assim que a aba volta a ficar em foco (ex: usuário voltou do app do banco/MP) ──
  useEffect(() => {
    function handleFocusOrVisible() {
      if (document.visibilityState === 'hidden') return
      if (payment?.id && payment.status === 'pending') {
        syncPaymentStatus(payment.id)
          .then((data) => {
            setPayment(data)
            if (data.status === 'approved') handleApproved(data)
          })
          .catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleFocusOrVisible)
    window.addEventListener('focus', handleFocusOrVisible)
    return () => {
      document.removeEventListener('visibilitychange', handleFocusOrVisible)
      window.removeEventListener('focus', handleFocusOrVisible)
    }
  }, [payment?.id, payment?.status, handleApproved])

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
  async function handleCreateCheckoutPreference() {
    setIsCreating(true)
    setError(null)

    // Precisa ser aberto de forma síncrona (antes de qualquer await) para não ser
    // bloqueado pelo navegador como pop-up indesejado.
    const popup = window.open('about:blank', '_blank')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.email) {
        setError('Você precisa estar logado com um e-mail válido para gerar o pagamento.')
        popup?.close()
        return
      }

      const preference = await createCheckoutPreference({
        orderId,
        amount,
        payerEmail: user.email,
      })

      const effectiveEvId = resolvedEventId || eventId
      const effectiveSlg = resolvedSlug || slug
      const effectiveFrm = resolvedFrom || from

      // Salvar orderId — permite detectar o pagamento caso o usuário feche a aba
      // e volte manualmente, ou em caso de fallback para redirecionamento.
      window.sessionStorage.setItem('mypass360-pending-payment', JSON.stringify({
        orderId,
        eventId: effectiveEvId,
        slug: effectiveSlg,
        from: effectiveFrm,
        initiatedAt: new Date().toISOString(),
      }))

      if (popup && !popup.closed) {
        // Fluxo principal: MP abre em nova aba, nossa aba continua monitorando o status
        mpPopupRef.current = popup
        popup.location.href = preference.initPoint

        const pending = await fetchPaymentByOrderId(orderId)
        setPayment(pending)
        if (pending?.id) {
          startPolling(pending.id)
        }
      } else {
        // Fallback: pop-up bloqueado pelo navegador — redireciona na mesma aba
        window.location.href = preference.initPoint
      }
    } catch (err) {
      popup?.close()
      setError(err instanceof Error ? err.message : 'Erro ao iniciar pagamento')
    } finally {
      setIsCreating(false)
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
        gap: '1.25rem',
      }}>
        {/* Order Details */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', paddingBottom: '1rem' }}>
          <div>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 2px' }}>Pedido</p>
            <strong style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{orderId}</strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 2px' }}>Total a pagar</p>
            <strong style={{ fontSize: '1.2rem', color: '#0f172a' }}>
              {amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </strong>
          </div>
        </div>

        {/* Checkout Pro — Mercado Pago abre em nova aba, com todos os métodos (PIX, Cartão, Boleto) */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
            O Mercado Pago abrirá em uma nova aba, onde você escolhe entre PIX, Cartão de Crédito ou Boleto.
            Assim que o pagamento for aprovado, a aba do Mercado Pago fecha sozinha e seu ingresso aparece aqui.
          </p>

          {/* Aviso de Transparência de Taxas e Reembolso */}
          <FeeRefundDisclaimer variant="card" />

          {error && <p style={{ color: '#dc2626', fontWeight: 600, margin: 0 }}>{error}</p>}

          <button
            type="button"
            onClick={handlePayClick}
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
            {isCreating ? 'Abrindo Mercado Pago...' : 'Pagar agora'}
          </button>
        </div>

        {/* Modal de aviso mobile — exibido antes de sair para o Mercado Pago */}
        {showMobileWarning && (
          <div
            onClick={() => setShowMobileWarning(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              backgroundColor: 'rgba(10, 15, 28, 0.72)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              padding: '0',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '480px',
                backgroundColor: '#ffffff',
                borderRadius: '20px 20px 0 0',
                padding: '2rem 1.5rem 2.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
                animation: 'slideUp 0.3s cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              {/* Handle visual */}
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#e2e8f0', margin: '0 auto -0.5rem' }} />

              {/* Título */}
              <div>
                <h3 style={{
                  margin: '0 0 0.5rem',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.3,
                }}>
                  Antes de prosseguir
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  color: '#475569',
                  lineHeight: 1.65,
                }}>
                  O pagamento será processado pelo <strong style={{ color: '#0f172a' }}>Mercado Pago</strong>.
                  Em alguns celulares, o sistema pode tentar abrir o aplicativo do Mercado Pago ou Mercado Livre.
                </p>
              </div>

              {/* Destaque da recomendação */}
              <div style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '12px',
                padding: '1rem 1.1rem',
              }}>
                <p style={{ margin: '0 0 0.3rem', fontWeight: 700, fontSize: '0.88rem', color: '#0369a1' }}>
                  Recomendamos permanecer no navegador
                </p>
                <p style={{ margin: 0, fontSize: '0.83rem', color: '#334155', lineHeight: 1.55 }}>
                  Pagar pelo navegador garante que a confirmação do PIX aconteça automaticamente
                  e seu ingresso seja gerado sem precisar de nenhuma ação extra.
                </p>
              </div>

              {/* Botão principal */}
              <button
                type="button"
                onClick={() => {
                  setShowMobileWarning(false)
                  void handleCreateCheckoutPreference()
                }}
                style={{
                  width: '100%',
                  padding: '0.9rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                }}
              >
                Continuar para pagamento
              </button>

              {/* Link de dispensa */}
              <button
                type="button"
                onClick={() => setShowMobileWarning(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                }}
              >
                Cancelar e revisar pedido
              </button>
            </div>
          </div>
        )}

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

      {error && <p style={{ color: '#dc2626', fontWeight: 600 }}>{error}</p>}

      {/* Auto-polling indicator */}
      {isPending && <AwaitingPaymentBanner />}

      {/* Success banner */}
      {isApproved && <SuccessBanner />}

      {isPending && (
        <FeeRefundDisclaimer variant="card" style={{ marginTop: '0.5rem' }} />
      )}

      {(() => {
        const targetEventId = resolvedEventId || eventId
        const targetSlug = resolvedSlug || slug
        const targetFrom = resolvedFrom || from

        const backToCheckoutHref = targetEventId
          ? `/checkout?eventId=${targetEventId}${targetFrom ? `&from=${targetFrom}` : ''}${targetSlug ? `&slug=${targetSlug}` : ''}`
          : targetSlug
            ? `/eventos/${targetSlug}`
            : '/carrinho'

        return (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {!isApproved && (
              <Link
                href={backToCheckoutHref}
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  color: '#374151',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                }}
              >
                Voltar para confirmar pedido
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
        )
      })()}
    </section>
  )
}



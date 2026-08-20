'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Payment } from '@mypass360/types'
import { createClient } from '@/lib/supabase/client'
import {
  confirmPayment,
  createCheckoutPreference,
  createPixPayment,
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

// ─── Validation Helpers ──────────────────────────────────────────────────────
function cleanCpfDigits(value: string) {
  return value.replace(/\D/g, '')
}

function formatCpfValue(value: string) {
  const clean = cleanCpfDigits(value).slice(0, 11)
  if (clean.length <= 3) return clean
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`
}

function isCpfValid(cpf: string) {
  const clean = cleanCpfDigits(cpf)
  if (clean.length !== 11) return false
  if (/^(\d)\1+$/.test(clean)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i)
  let rev = (sum * 10) % 11
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(clean[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i)
  rev = (sum * 10) % 11
  if (rev === 10 || rev === 11) rev = 0
  return rev === parseInt(clean[10])
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

  // Payment Method Selection States
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'other'>('pix')
  const [payerCpf, setPayerCpf] = useState('')
  const [cpfError, setCpfError] = useState<string | null>(null)

  // TODO: Remover quando a integração oficial do Mercado Pago estiver concluída.
  const [manualCode, setManualCode] = useState('')
  const [isManualConfirming, setIsManualConfirming] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)

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

  // ── Create Direct PIX Payment ───────────────────────────────────────────
  async function handleCreatePixPayment(e: React.FormEvent) {
    e.preventDefault()
    setCpfError(null)
    setError(null)

    const cleanCpf = cleanCpfDigits(payerCpf)
    if (!isCpfValid(cleanCpf)) {
      setCpfError('CPF inválido. Verifique o número digitado.')
      return
    }

    setIsCreating(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.email) {
        setError('Você precisa estar logado com um e-mail válido para gerar o pagamento.')
        return
      }

      const newPayment = await createPixPayment({
        orderId,
        provider: 'pix',
        amount,
        payerEmail: user.email,
        payerDocument: cleanCpf,
      })

      setPayment(newPayment)
      if (newPayment.id) {
        startPolling(newPayment.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar PIX')
    } finally {
      setIsCreating(false)
    }
  }

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

      // Salvar orderId — permite detectar o pagamento caso o usuário feche a aba
      // e volte manualmente, ou em caso de fallback para redirecionamento.
      window.sessionStorage.setItem('mypass360-pending-payment', JSON.stringify({
        orderId,
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

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '10px' }}>
          <button
            type="button"
            onClick={() => setPaymentMethod('pix')}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: '8px',
              border: 'none',
              background: paymentMethod === 'pix' ? '#fff' : 'transparent',
              color: paymentMethod === 'pix' ? '#0f172a' : '#64748b',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: paymentMethod === 'pix' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            ⚡ Pagar com PIX
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('other')}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: '8px',
              border: 'none',
              background: paymentMethod === 'other' ? '#fff' : 'transparent',
              color: paymentMethod === 'other' ? '#0f172a' : '#64748b',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: paymentMethod === 'other' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            💳 Outros (Cartão, Boleto)
          </button>
        </div>

        {/* PIX Form */}
        {paymentMethod === 'pix' && (
          <form onSubmit={handleCreatePixPayment} style={{ display: 'grid', gap: '1rem' }}>
            <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
              Gere o QR Code PIX direto aqui no site. O ingresso é liberado em segundos assim que você pagar.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label htmlFor="payerCpf" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                CPF do Pagador *
              </label>
              <input
                id="payerCpf"
                type="text"
                maxLength={14}
                placeholder="000.000.000-00"
                value={payerCpf}
                onChange={(e) => setPayerCpf(formatCpfValue(e.target.value))}
                required
                style={{
                  padding: '0.65rem 0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${cpfError ? '#ef4444' : '#cbd5e1'}`,
                  fontSize: '0.95rem',
                  outline: 'none',
                  background: '#fff',
                }}
              />
              {cpfError && (
                <span style={{ color: '#ef4444', fontSize: '0.78rem', fontWeight: 600 }}>{cpfError}</span>
              )}
            </div>

            {error && <p style={{ color: '#dc2626', fontWeight: 600, margin: 0 }}>{error}</p>}

            <button
              type="submit"
              disabled={isCreating}
              style={{
                padding: '0.875rem 1rem',
                borderRadius: '10px',
                border: 'none',
                background: isCreating ? '#94a3b8' : '#22c55e',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {isCreating ? 'Gerando PIX...' : 'Gerar QR Code PIX'}
            </button>
          </form>
        )}

        {/* Other Payments (Checkout Pro) */}
        {paymentMethod === 'other' && (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
              Você será redirecionado para o Mercado Pago onde poderá pagar por Cartão de Crédito ou Boleto Bancário.
            </p>

            {error && <p style={{ color: '#dc2626', fontWeight: 600, margin: 0 }}>{error}</p>}

            <button
              type="button"
              onClick={handleCreateCheckoutPreference}
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
              {isCreating ? 'Redirecionando...' : 'Ir para o Mercado Pago'}
            </button>
          </div>
        )}

        {/* Dev Manual Confirmation */}
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

      {/* Direct PIX display (no redirect!) */}
      {payment.pixCode && isPending && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          background: '#f8fafc',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}>
          <p style={{ fontWeight: 700, margin: 0, color: '#334155', fontSize: '0.95rem' }}>
            Escaneie o QR Code abaixo para pagar
          </p>

          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(payment.pixCode)}&size=200x200`}
            alt="PIX QR Code"
            style={{
              width: 200,
              height: 200,
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              padding: '4px',
              background: '#fff',
            }}
          />

          <div style={{ width: '100%' }}>
            <label style={{ display: 'block', color: '#6b7280', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Código PIX Copia e Cola
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                readOnly
                value={payment.pixCode}
                style={{
                  flex: 1,
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  background: '#fff',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(payment.pixCode || '')
                  alert('Código copiado!')
                }}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#0f172a',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Copiar
              </button>
            </div>
          </div>
        </div>
      )}

      {payment.pixExpiresAt && isPending && (
        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>
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
      marginTop: '1rem',
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

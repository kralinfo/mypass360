'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Payment } from '@mypass360/types'
import { createClient } from '@/lib/supabase/client'
import { confirmPayment, createCheckoutPreference, fetchPaymentById, manualConfirmPayment } from '../services/payment.service'
import { useCart } from '@/features/cart/cart-context'

interface PaymentStatusCardProps {
  paymentId?: string
  orderId: string
  eventId: string
  amount: number
}

export function PaymentStatusCard({ paymentId, orderId, eventId, amount }: PaymentStatusCardProps) {
  const router = useRouter()
  const { clearCart } = useCart()
  const [payment, setPayment] = useState<Payment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // TODO: Remover quando a integração oficial do Mercado Pago estiver concluída.
  const [manualCode, setManualCode] = useState('')
  const [isManualConfirming, setIsManualConfirming] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)

  useEffect(() => {
    if (!paymentId) {
      setIsLoading(false)
      return
    }

    let isMounted = true

    fetchPaymentById(paymentId)
      .then((data) => {
        if (isMounted) {
          setPayment(data)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar pagamento')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [paymentId])

  useEffect(() => {
    if (!payment?.id || payment.status !== 'pending') {
      return
    }

    const refreshPayment = window.setInterval(() => {
      fetchPaymentById(payment.id)
        .then((data) => {
          setPayment(data)
          // Quando webhook do MP aprovar → limpa carrinho e redireciona
          if (data.status === 'approved') {
            clearCart()
            window.clearInterval(refreshPayment)
            setTimeout(() => router.push('/meus-ingressos'), 1500)
          }
        })
        .catch(() => undefined)
    }, 5000)

    return () => {
      window.clearInterval(refreshPayment)
    }
  }, [payment?.id, payment?.status])

  async function handleCreatePayment() {
    setIsCreating(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar pagamento')
    } finally {
      setIsCreating(false)
    }
  }

  async function handleConfirm() {
    const currentPaymentId = payment?.id ?? paymentId

    if (!currentPaymentId) {
      setError('Nenhum pagamento foi gerado para este pedido ainda.')
      return
    }

    setIsConfirming(true)
    setError(null)

    try {
      const updated = await confirmPayment(currentPaymentId)
      setPayment(updated)
      if (updated.status === 'approved') {
        clearCart()
        setTimeout(() => router.push('/meus-ingressos'), 1000)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar pagamento')
    } finally {
      setIsConfirming(false)
    }
  }

  // TODO: Remover quando a integração oficial do Mercado Pago estiver concluída.
  async function handleManualConfirm() {
    setIsManualConfirming(true)
    setManualError(null)

    try {
      const updated = await manualConfirmPayment(orderId, manualCode)
      setPayment(updated)
      setManualCode('')
      // Limpa carrinho e redireciona para meus ingressos
      clearCart()
      setTimeout(() => router.push('/meus-ingressos'), 1200)
    } catch (err: unknown) {
      setManualError(err instanceof Error ? err.message : 'Erro na confirmação manual')
    } finally {
      setIsManualConfirming(false)
    }
  }

  if (isLoading) {
    return <p>Carregando pagamento...</p>
  }

  if (!payment) {
    return (
      <section
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'grid',
          gap: '1rem',
        }}
      >
        <div>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Pedido</p>
          <strong>{orderId}</strong>
        </div>

        <div>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Total a pagar</p>
          <strong>{amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </div>

        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          Ao continuar, você será redirecionado para o ambiente seguro do Mercado Pago, onde poderá escolher entre PIX, cartão de crédito, boleto e outros meios disponíveis.
        </p>

        {error && <p style={{ color: '#dc2626' }}>{error}</p>}

        <button
          type="button"
          onClick={handleCreatePayment}
          disabled={isCreating}
          style={{
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            border: 'none',
            background: '#0f172a',
            color: '#fff',
            cursor: isCreating ? 'not-allowed' : 'pointer',
          }}
        >
          {isCreating ? 'Redirecionando...' : 'Continuar para pagamento'}
        </button>

        {/* TODO: Remover quando a integração oficial do Mercado Pago estiver concluída. */}
        <div
          style={{
            marginTop: '0.5rem',
            background: '#fefce8',
            border: '1px dashed #fbbf24',
            borderRadius: '10px',
            padding: '1rem',
            display: 'grid',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1rem' }}>🛠️</span>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e' }}>
              Confirmação Manual — Somente Desenvolvimento
            </p>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#78350f', lineHeight: 1.5 }}>
            Insira o código de confirmação para simular um pagamento aprovado e gerar os ingressos.
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
              onClick={handleManualConfirm}
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
            <p style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>{manualError}</p>
          )}
        </div>
      </section>
    )
  }

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.25rem',
        display: 'grid',
        gap: '1rem',
      }}
    >
      <div>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Pedido</p>
        <strong>{orderId}</strong>
      </div>

      <div>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Valor</p>
        <strong>
          {payment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </strong>
      </div>

      <div>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Status</p>
        <strong style={{ color: payment.status === 'approved' ? '#15803d' : '#b45309' }}>
          {payment.status === 'approved' ? 'Pagamento aprovado' : 'Aguardando pagamento'}
        </strong>
      </div>

      {payment.pixCode && (
        <div>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
            Código PIX copia e cola
          </p>
          <textarea
            readOnly
            value={payment.pixCode}
            style={{
              width: '100%',
              minHeight: '120px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              padding: '0.75rem',
              fontFamily: 'monospace',
            }}
          />
        </div>
      )}

      {payment.pixExpiresAt && payment.status === 'pending' && (
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          Expira em: {new Date(payment.pixExpiresAt).toLocaleString('pt-BR')}
        </p>
      )}

      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {payment.status === 'approved' && (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>✅</span>
            <div>
              <p style={{ fontWeight: 700, color: '#15803d', marginBottom: '0.25rem' }}>Pagamento aprovado!</p>
              <p style={{ fontSize: '0.875rem', color: '#166534' }}>
                Seus ingressos foram gerados e estão disponíveis em{' '}
                <Link href="/meus-ingressos" style={{ color: '#15803d', fontWeight: 700 }}>
                  Meus Ingressos
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        {payment.status === 'pending' && (
          // TODO: Remover quando a integração oficial do Mercado Pago estiver concluída.
          <div
            style={{
              background: '#fefce8',
              border: '1px dashed #fbbf24',
              borderRadius: '10px',
              padding: '1rem',
              display: 'grid',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem' }}>🛠️</span>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#92400e' }}>
                Confirmação Manual — Somente Desenvolvimento
              </p>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#78350f', lineHeight: 1.5 }}>
              Insira o código para simular a aprovação do pagamento e gerar os ingressos automaticamente.
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
                onClick={handleManualConfirm}
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
              <p style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>{manualError}</p>
            )}
          </div>
        )}

        <Link
          href={`/checkout?eventId=${eventId}`}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            color: '#111827',
            textDecoration: 'none',
          }}
        >
          Voltar ao checkout
        </Link>

        <Link
          href="/eventos"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            color: '#111827',
            textDecoration: 'none',
          }}
        >
          Ver eventos
        </Link>
      </div>
    </section>
  )
}

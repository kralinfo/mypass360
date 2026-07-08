'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Payment } from '@mypass360/types'
import { confirmPayment, createPixPayment, fetchPaymentById } from '../services/payment.service'

interface PaymentStatusCardProps {
  paymentId?: string
  orderId: string
  eventId: string
  amount: number
}

export function PaymentStatusCard({ paymentId, orderId, eventId, amount }: PaymentStatusCardProps) {
  const [payment, setPayment] = useState<Payment | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<'pix' | 'credit_card' | 'boleto'>('pix')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  async function handleCreatePayment() {
    setIsCreating(true)
    setError(null)

    try {
      if (selectedMethod !== 'pix') {
        setError('Neste MVP, apenas PIX está habilitado.')
        return
      }

      const created = await createPixPayment({
        orderId,
        provider: 'pix',
        amount,
      })

      setPayment(created)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar cobrança PIX')
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar pagamento')
    } finally {
      setIsConfirming(false)
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

        <div>
          <p style={{ marginBottom: '0.75rem', fontWeight: 600 }}>Escolha o método de pagamento</p>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {[
              { id: 'pix', title: 'PIX', description: 'Pagamento instantâneo com QR Code e copia e cola.' },
              { id: 'credit_card', title: 'Cartão de crédito', description: 'Em breve.' },
              { id: 'boleto', title: 'Boleto', description: 'Em breve.' },
            ].map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelectedMethod(method.id as 'pix' | 'credit_card' | 'boleto')}
                style={{
                  textAlign: 'left',
                  padding: '1rem',
                  borderRadius: '10px',
                  border:
                    selectedMethod === method.id ? '2px solid #0f172a' : '1px solid #d1d5db',
                  background: '#fff',
                  cursor: 'pointer',
                  opacity: method.id === 'pix' ? 1 : 0.7,
                }}
              >
                <strong>{method.title}</strong>
                <p style={{ marginTop: '0.35rem', color: '#6b7280', fontSize: '0.9rem' }}>
                  {method.description}
                </p>
              </button>
            ))}
          </div>
        </div>

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
          {isCreating ? 'Gerando cobrança...' : 'Continuar para pagamento'}
        </button>
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
        {payment.status === 'pending' && (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: '#15803d',
              color: '#fff',
              cursor: isConfirming ? 'not-allowed' : 'pointer',
            }}
          >
            {isConfirming ? 'Confirmando...' : 'Simular pagamento aprovado'}
          </button>
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

'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCheckout } from '../hooks/useCheckout'
import { useCart } from '@/features/cart/cart-context'

interface CheckoutFormProps {
  eventId: string
}

export function CheckoutForm({ eventId }: CheckoutFormProps) {
  const {
    event,
    ticketTypes,
    selectedItems,
    total,
    isLoading,
    isSubmitting,
    error,
    loadCheckout,
    setTicketQuantity,
    handleSubmit,
  } = useCheckout()
  const router = useRouter()
  const { getItemsForEvent } = useCart()
  const hydratedFromCartRef = useRef(false)

  useEffect(() => {
    loadCheckout(eventId)
  }, [eventId, loadCheckout])

  useEffect(() => {
    if (!event || ticketTypes.length === 0 || hydratedFromCartRef.current) {
      return
    }

    const cartItems = getItemsForEvent(eventId)

    if (cartItems.length === 0) {
      return
    }

    for (const cartItem of cartItems) {
      const matchingTicketType = ticketTypes.find((ticketType) => ticketType.id === cartItem.ticketTypeId)

      if (matchingTicketType) {
        setTicketQuantity(matchingTicketType, cartItem.quantity)
      }
    }

    hydratedFromCartRef.current = true
  }, [event, eventId, getItemsForEvent, setTicketQuantity, ticketTypes])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = await handleSubmit(eventId)

    if (result?.orderId) {
      router.push(
        `/checkout/pagamento?orderId=${result.orderId}&eventId=${eventId}&amount=${result.amount}`
      )
      router.refresh()
    }
  }

  if (isLoading) {
    return <p>Carregando checkout...</p>
  }

  if (!event) {
    return <p>Evento inválido para checkout.</p>
  }

  const selectedById = new Map(selectedItems.map((item) => [item.ticketTypeId, item.quantity]))

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: 'grid',
        gap: '1rem',
        maxWidth: '760px',
        margin: '0 auto',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.25rem',
      }}
    >
      <header>
        <h2 style={{ marginBottom: '0.5rem' }}>{event.title}</h2>
        <p style={{ color: '#6b7280' }}>{event.location}</p>
      </header>

      {ticketTypes.length === 0 ? (
        <p>Esse evento ainda não possui tipos de ingresso cadastrados.</p>
      ) : (
        <section style={{ display: 'grid', gap: '0.75rem' }}>
          {ticketTypes.map((ticketType) => {
            const quantity = selectedById.get(ticketType.id) ?? 0
            const available = Math.max(ticketType.quantity - ticketType.sold, 0)

            return (
              <article
                key={ticketType.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '0.85rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div>
                  <h3 style={{ marginBottom: '0.25rem', fontSize: '1rem' }}>{ticketType.name}</h3>
                  <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                    {ticketType.price.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}{' '}
                    • {available} disponíveis
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setTicketQuantity(ticketType, Math.max(quantity - 1, 0))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    -
                  </button>
                  <span style={{ minWidth: '24px', textAlign: 'center' }}>{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setTicketQuantity(ticketType, Math.min(quantity + 1, available))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    +
                  </button>
                </div>
              </article>
            )
          })}
        </section>
      )}

      <section
        style={{
          borderTop: '1px solid #e5e7eb',
          paddingTop: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Total</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || selectedItems.length === 0}
          style={{
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            background: '#0f172a',
            color: '#fff',
            cursor: isSubmitting || selectedItems.length === 0 ? 'not-allowed' : 'pointer',
            opacity: isSubmitting || selectedItems.length === 0 ? 0.7 : 1,
          }}
        >
          {isSubmitting ? 'Processando...' : 'Finalizar compra'}
        </button>
      </section>

      {error && (
        <p role="alert" style={{ color: '#dc2626', marginTop: '0.5rem' }}>
          {error}
        </p>
      )}
    </form>
  )
}

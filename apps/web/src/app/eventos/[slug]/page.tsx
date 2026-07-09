'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Event } from '@mypass360/types'
import { fetchPublishedEventBySlug } from '@/features/events/services/supabase-events.service'
import { fetchCheckoutData, type CheckoutTicketType } from '@/features/checkout/services/checkout.service'
import { useCart } from '@/features/cart/cart-context'

interface EventDetailPageProps {
  params: Promise<{ slug: string }>
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const [event, setEvent] = useState<Event | null>(null)
  const [ticketTypes, setTicketTypes] = useState<CheckoutTicketType[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [notification, setNotification] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { addToCart } = useCart()

  useEffect(() => {
    if (!notification) return

    const timeout = window.setTimeout(() => setNotification(null), 2000)
    return () => window.clearTimeout(timeout)
  }, [notification])

  useEffect(() => {
    params
      .then(({ slug }) => fetchPublishedEventBySlug(slug))
      .then(async (data) => {
        if (!data) {
          setError('Evento não encontrado')
          return
        }

        setEvent(data)

        const checkoutData = await fetchCheckoutData(data.id)
        setTicketTypes(checkoutData.ticketTypes)
        setQuantities(
          checkoutData.ticketTypes.reduce<Record<string, number>>((accumulator, ticketType) => {
            accumulator[ticketType.id] = 0
            return accumulator
          }, {})
        )
      })
      .catch(() => {
        setError('Erro ao carregar evento')
      })
      .finally(() => setIsLoading(false))
  }, [params])

  if (isLoading) {
    return (
      <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <p>Carregando...</p>
      </main>
    )
  }

  if (error || !event) {
    return (
      <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Erro</h1>
        <p style={{ color: '#dc2626' }}>{error || 'Evento não encontrado'}</p>
        <Link href="/eventos">Voltar para eventos</Link>
      </main>
    )
  }

  const formattedDate = new Date(event.date).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const formattedPrice =
    event.price === 0
      ? 'Gratuito'
      : event.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  function setTicketQuantity(ticketTypeId: string, quantity: number, available: number) {
    setQuantities((current) => ({
      ...current,
      [ticketTypeId]: Math.max(0, Math.min(quantity, available)),
    }))
  }

  function handleAddToCart(ticketType: CheckoutTicketType) {
    const quantity = quantities[ticketType.id] ?? 0
    const available = Math.max(ticketType.quantity - ticketType.sold, 0)
    const currentEvent = event

    if (!currentEvent || quantity <= 0) {
      setNotification('Escolha uma quantidade antes de adicionar ao carrinho.')
      return
    }

    addToCart({
      eventId: currentEvent.id,
      eventSlug: currentEvent.slug,
      eventTitle: currentEvent.title,
      eventDate: currentEvent.date,
      eventLocation: currentEvent.location,
      ticketTypeId: ticketType.id,
      ticketTypeName: ticketType.name,
      unitPrice: ticketType.price,
      available,
      quantity,
    })

    setNotification(`${quantity} ingressos ${ticketType.name} adicionados ao carrinho.`)
  }

  function handleBuyNow(ticketType: CheckoutTicketType) {
    handleAddToCart(ticketType)
    if (event) {
      router.push(`/checkout?eventId=${event.id}`)
    }
  }

  return (
    <main style={{ position: 'relative', padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      {notification ? (
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            zIndex: 1000,
            maxWidth: '320px',
            padding: '1rem 1.1rem',
            borderRadius: '14px',
            background: '#0f172a',
            color: '#fff',
            boxShadow: '0 14px 32px rgba(15, 23, 42, 0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', borderRadius: '999px', background: '#f59e0b', color: '#0f172a', fontSize: '1rem' }}>
            🛒
          </span>
          <span style={{ fontSize: '0.95rem', lineHeight: 1.4 }}>{notification}</span>
        </div>
      ) : null}

      <div
        style={{
          height: '200px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '3rem',
          marginBottom: '1.5rem',
        }}
      >
        🎵
      </div>

      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{event.title}</h1>

      <div
        style={{
          display: 'flex',
          gap: '2rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
          padding: '1rem',
          background: '#f8fafc',
          borderRadius: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>📅</span>
          <time dateTime={event.date}>{formattedDate}</time>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>📍</span>
          <span>{event.location}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>👥</span>
          <span>{event.capacity.toLocaleString('pt-BR')} lugares</span>
        </div>
      </div>

      <p style={{ color: '#64748b', lineHeight: '1.7', marginBottom: '2rem' }}>
        {event.description}
      </p>


      <section
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'grid',
          gap: '0.85rem',
        }}
      >
        <div>
          <h2 style={{ marginBottom: '0.25rem' }}>Adicionar ao carrinho</h2>
          <p style={{ color: '#64748b' }}>
            Selecione a quantidade, adicione ao carrinho ou siga direto para o checkout.
          </p>
        </div>

        {ticketTypes.length === 0 ? (
          <p style={{ color: '#64748b' }}>Esse evento ainda não possui tipos de ingresso cadastrados.</p>
        ) : (
          ticketTypes.map((ticketType) => {
            const available = Math.max(ticketType.quantity - ticketType.sold, 0)
            const quantity = quantities[ticketType.id] ?? 0

            return (
              <article
                key={ticketType.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '0.95rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h3 style={{ marginBottom: '0.25rem' }}>{ticketType.name}</h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                    {ticketType.price.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}{' '}
                    • {available} disponíveis
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setTicketQuantity(ticketType.id, quantity - 1, available)}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    -
                  </button>
                  <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 600 }}>{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setTicketQuantity(ticketType.id, quantity + 1, available)}
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddToCart(ticketType)}
                    style={{
                      background: '#f8fafc',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      padding: '0.7rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Adicionar ao carrinho
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBuyNow(ticketType)}
                    style={{
                      background: '#0f172a',
                      color: '#fff',
                      border: 'none',
                      padding: '0.7rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Comprar agora
                  </button>
                </div>
              </article>
            )
          })
        )}
      </section>
    </main>
  )
}

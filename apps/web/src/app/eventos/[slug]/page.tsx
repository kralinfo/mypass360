'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Event } from '@mypass360/types'
import { fetchPublishedEventBySlug } from '@/features/events/services/supabase-events.service'
import { fetchCheckoutData, type CheckoutTicketType } from '@/features/checkout/services/checkout.service'
import { useCart } from '@/features/cart/cart-context'
import { BackButton } from '@/components/BackButton'
import { FreeRegistrationModal } from '@/features/events/components/FreeRegistrationModal'

interface EventDetailPageProps {
  params: Promise<{ slug: string }>
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const [event, setEvent] = useState<Event | null>(null)
  const [ticketTypes, setTicketTypes] = useState<CheckoutTicketType[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [expandedTickets, setExpandedTickets] = useState<Record<string, boolean>>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFreeModalOpen, setIsFreeModalOpen] = useState(false)
  const router = useRouter()
  const { addToCart } = useCart()

  useEffect(() => {
    if (!successMessage) return

    const timeout = window.setTimeout(() => setSuccessMessage(null), 2000)
    return () => window.clearTimeout(timeout)
  }, [successMessage])

  useEffect(() => {
    if (!warningMessage) return

    const timeout = window.setTimeout(() => setWarningMessage(null), 2000)
    return () => window.clearTimeout(timeout)
  }, [warningMessage])

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
        if (checkoutData.ticketTypes.length > 0) {
          setExpandedTickets({ [checkoutData.ticketTypes[0].id]: true })
        }
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

  function persistDirectCheckoutSelection(items: Array<{ ticketTypeId: string; quantity: number; unitPrice: number }>) {
    if (typeof window === 'undefined' || !event) {
      return
    }

    window.sessionStorage.setItem(
      `mypass360-direct-checkout:${event.id}`,
      JSON.stringify({
        eventId: event.id,
        eventSlug: event.slug,
        items,
      })
    )
  }

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
      setWarningMessage('Escolha uma quantidade antes de adicionar ao carrinho.')
      return
    }

    setWarningMessage(null)
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

    setQuantities((current) => ({
      ...current,
      [ticketType.id]: 0,
    }))

    setSuccessMessage(`${quantity} ingressos ${ticketType.name} adicionados ao carrinho.`)
  }

  function handleAddAllToCart() {
    if (!event) return false

    const itemsToAdd = ticketTypes
      .filter((ticketType) => (quantities[ticketType.id] ?? 0) > 0)
      .map((ticketType) => ({
        eventId: event.id,
        eventSlug: event.slug,
        eventTitle: event.title,
        eventDate: event.date,
        eventLocation: event.location,
        ticketTypeId: ticketType.id,
        ticketTypeName: ticketType.name,
        unitPrice: ticketType.price,
        available: Math.max(ticketType.quantity - ticketType.sold, 0),
        quantity: quantities[ticketType.id] ?? 0,
      }))

    if (itemsToAdd.length === 0) {
      setWarningMessage('Selecione ao menos um ingresso para adicionar ao carrinho.')
      return false
    }

    setWarningMessage(null)
    itemsToAdd.forEach((item) => addToCart(item))
    setQuantities((current) => {
      const next = { ...current }
      itemsToAdd.forEach((item) => {
        next[item.ticketTypeId] = 0
      })
      return next
    })

    setSuccessMessage(`Adicionados ${itemsToAdd.reduce((sum, item) => sum + item.quantity, 0)} ingressos ao carrinho.`)
    return true
  }

  function handleBuyAll() {
    if (!event) return

    const directItems = ticketTypes
      .filter((ticketType) => (quantities[ticketType.id] ?? 0) > 0)
      .map((ticketType) => ({
        ticketTypeId: ticketType.id,
        quantity: quantities[ticketType.id] ?? 0,
        unitPrice: ticketType.price,
      }))

    if (directItems.length === 0) {
      setWarningMessage('Selecione ao menos um ingresso para continuar.')
      return
    }

    setWarningMessage(null)
    persistDirectCheckoutSelection(directItems)
    setSuccessMessage(null)
    router.push(`/checkout?eventId=${event.id}&from=event&slug=${event.slug}`)
  }

  function handleBuyNow(ticketType: CheckoutTicketType) {
    const quantity = quantities[ticketType.id] ?? 0

    if (!event || quantity <= 0) {
      setWarningMessage('Escolha uma quantidade antes de continuar.')
      return
    }

    setWarningMessage(null)
    persistDirectCheckoutSelection([
      {
        ticketTypeId: ticketType.id,
        quantity,
        unitPrice: ticketType.price,
      },
    ])
    setSuccessMessage(null)
    router.push(`/checkout?eventId=${event.id}&from=event&slug=${event.slug}`)
  }

  return (
    <>
      <style>{`
        .detail-banner {
          height: 260px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 3rem;
          margin-bottom: 1.25rem;
        }
        .detail-title {
          font-size: 1.85rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 0.75rem;
          letter-spacing: -0.02em;
        }
        .detail-info-grid {
          display: flex;
          gap: 1.25rem;
          flex-wrap: wrap;
          margin-bottom: 1.25rem;
          padding: 0.85rem 1rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }
        .detail-info-item {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.88rem;
          color: #475569;
        }
        .ticket-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          margin-bottom: 0.5rem;
          overflow: hidden;
          transition: all 0.2s ease;
        }
        .ticket-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.85rem 1rem;
          cursor: pointer;
          background: #fff;
          user-select: none;
        }
        .ticket-header:hover {
          background: #f8fafc;
        }
        .ticket-header-title {
          margin: 0;
          font-size: 0.98rem;
          color: #0f172a;
          font-weight: 700;
        }
        .ticket-header-price {
          color: #10b981;
          font-size: 0.92rem;
          font-weight: 700;
        }
        .ticket-body {
          padding: 1rem;
          border-top: 1px solid #e2e8f0;
          background: #fafafa;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .ticket-actions-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .chevron {
          transition: transform 0.2s ease;
          color: #64748b;
          font-size: 0.8rem;
        }
        .chevron.expanded {
          transform: rotate(180deg);
        }
        @media (max-width: 680px) {
          .detail-banner {
            height: 120px;
            font-size: 2.2rem;
            margin-bottom: 1rem;
          }
          .detail-title {
            font-size: 1.5rem;
          }
          .detail-info-grid {
            flex-direction: column;
            gap: 0.6rem;
            padding: 0.75rem;
          }
          .ticket-actions-group {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
            width: 100%;
          }
          .ticket-action-btn {
            flex: 1;
            padding: 0.6rem 0.5rem !important;
            font-size: 0.78rem !important;
            justify-content: center;
          }
        }
      `}</style>
      <main style={{ position: 'relative', maxWidth: '850px', margin: '0 auto', padding: '1rem 0.75rem' }}>
        <BackButton href="/eventos" style={{ marginBottom: '1rem' }} />

        {successMessage ? (
          <div
            style={{
              position: 'fixed',
              top: '1rem',
              right: '1rem',
              zIndex: 1000,
              maxWidth: '300px',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              background: '#0f172a',
              color: '#fff',
              boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '1.75rem', height: '1.75rem', borderRadius: '999px', background: '#f59e0b', color: '#0f172a', fontSize: '0.9rem' }}>
              🛒
            </span>
            <span style={{ fontSize: '0.88rem', lineHeight: 1.35 }}>{successMessage}</span>
          </div>
        ) : null}

        <div className="detail-banner" style={{ overflow: 'hidden', padding: 0 }}>
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            '🎵'
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <h1 className="detail-title" style={{ margin: 0 }}>{event.title}</h1>
          {event.visibility === 'PRIVATE' && (
            <span
              style={{
                background: '#f5f3ff',
                color: '#6d28d9',
                border: '1px solid #c4b5fd',
                padding: '0.3rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              🔒 Evento Privado
            </span>
          )}
        </div>

        {/* Banner de Indisponibilidade por solicitação de exclusão */}
        {event.deletion_status === 'pending' && (
          <div
            style={{
              background: '#fef2f2',
              border: '1.5px solid #fca5a5',
              borderRadius: '12px',
              padding: '0.85rem 1.1rem',
              marginBottom: '1.25rem',
              color: '#991b1b',
              fontSize: '0.9rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span>Este evento está temporariamente indisponível.</span>
          </div>
        )}

        <div className="detail-info-grid" style={{ opacity: event.deletion_status === 'pending' ? 0.6 : 1 }}>
          <div className="detail-info-item">
            <span>📅</span>
            <time dateTime={event.date}>{formattedDate}</time>
          </div>
          <div className="detail-info-item">
            <span>📍</span>
            <span>{event.location}</span>
          </div>
          <div className="detail-info-item">
            <span>👥</span>
            <span>{event.capacity.toLocaleString('pt-BR')} lugares</span>
          </div>
        </div>

        <p style={{ color: '#475569', lineHeight: '1.6', fontSize: '0.92rem', marginBottom: '1.5rem', padding: '0 0.25rem', opacity: event.deletion_status === 'pending' ? 0.6 : 1 }}>
          {event.description}
        </p>

        {event.event_type === 'FREE' ? (
          <section
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '2px solid #86efac',
              borderRadius: '16px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.1rem',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 10px 25px -5px rgba(22, 163, 74, 0.15)',
              opacity: event.deletion_status === 'pending' ? 0.5 : 1,
              pointerEvents: event.deletion_status === 'pending' ? 'none' : 'auto',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#16a34a',
                color: '#ffffff',
                padding: '0.4rem 1rem',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              ✨ Evento Gratuito
            </div>

            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#14532d', margin: '0 0 0.35rem 0' }}>
                Inscrição Gratuita & Confirmação de Presença
              </h2>
              <p style={{ color: '#166534', fontSize: '0.95rem', margin: 0, maxWidth: '480px', lineHeight: 1.5 }}>
                Garanta sua vaga sem custos. Ao confirmar sua presença, seu ingresso com QR Code individual será gerado instantaneamente.
              </p>

              {event.has_password && (
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: '0.75rem',
                    background: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #fcd34d',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                  }}
                >
                  🔒 Este evento exige senha de acesso do convidado
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsFreeModalOpen(true)}
              disabled={event.deletion_status === 'pending'}
              style={{
                padding: '0.95rem 2.25rem',
                borderRadius: '14px',
                background: '#16a34a',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1.1rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(22, 163, 74, 0.3)',
                transition: 'transform 0.2s ease, background 0.2s ease',
              }}
            >
              🎉 Confirmar Presença Agora
            </button>
          </section>
        ) : (
          <section
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1rem',
              display: 'grid',
              gap: '0.75rem',
              opacity: event.deletion_status === 'pending' ? 0.5 : 1,
              pointerEvents: event.deletion_status === 'pending' ? 'none' : 'auto',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.15rem', color: '#0f172a', fontWeight: 700, marginBottom: '0.15rem' }}>Tipos de Ingresso</h2>
              <p style={{ color: '#64748b', fontSize: '0.82rem', margin: 0 }}>
                Toque no ingresso para expandir as opções de compra.
              </p>
              {warningMessage ? (
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: '#fef3c7',
                    color: '#92400e',
                    fontSize: '0.85rem',
                    border: '1px solid #fde68a',
                  }}
                >
                  {warningMessage}
                </div>
              ) : null}
            </div>

            {ticketTypes.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Esse evento ainda não possui tipos de ingresso cadastrados.</p>
            ) : (
              <>
                {ticketTypes.map((ticketType) => {
                  const available = Math.max(ticketType.quantity - ticketType.sold, 0)
                  const quantity = quantities[ticketType.id] ?? 0
                  const isExpanded = !!expandedTickets[ticketType.id]

                  return (
                    <article key={ticketType.id} className="ticket-card">
                      {/* Header clicável para expandir/recolher */}
                      <div 
                        className="ticket-header" 
                        onClick={() => setExpandedTickets(prev => ({ ...prev, [ticketType.id]: !isExpanded }))}
                      >
                        <div>
                          <h3 className="ticket-header-title">{ticketType.name}</h3>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{available} disponíveis</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span className="ticket-header-price">
                            {ticketType.price.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                          </span>
                          <span className={`chevron ${isExpanded ? 'expanded' : ''}`}>▼</span>
                        </div>
                      </div>

                      {/* Corpo que só renderiza quando expandido */}
                      {isExpanded && (
                        <div className="ticket-body">
                          {ticketType.description && (
                            <p style={{ color: '#475569', fontSize: '0.85rem', lineHeight: 1.45, margin: 0 }}>
                              {ticketType.description}
                            </p>
                          )}

                          <div className="ticket-actions-group">
                            {/* Seleção de quantidade */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.25rem' }}>
                              <button
                                type="button"
                                onClick={() => setTicketQuantity(ticketType.id, quantity - 1, available)}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  background: '#fff',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                }}
                              >
                                -
                              </button>
                              <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 'bold' }}>
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => setTicketQuantity(ticketType.id, quantity + 1, available)}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  background: '#fff',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                }}
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAddToCart(ticketType)}
                              className="ticket-action-btn"
                              style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: '8px',
                                border: '1px solid #0f172a',
                                background: '#fff',
                                color: '#0f172a',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Adicionar ao Carrinho
                            </button>

                            <button
                              type="button"
                              onClick={() => handleBuyNow(ticketType)}
                              className="ticket-action-btn"
                              style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#0f172a',
                                color: '#fff',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Comprar Agora
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  )
                })}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={handleAddAllToCart}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      color: '#0f172a',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                    }}
                  >
                    Adicionar Tudo ao Carrinho
                  </button>
                  <button
                    type="button"
                    onClick={handleBuyAll}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#0f172a',
                      color: '#fff',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                    }}
                  >
                    Comprar Tudo
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        <FreeRegistrationModal
          event={event}
          isOpen={isFreeModalOpen}
          onClose={() => setIsFreeModalOpen(false)}
        />
      </main>
    </>
  )
}

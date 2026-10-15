'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/features/cart/cart-context'
import { BackButton } from '@/components/BackButton'

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CartPage() {
  const router = useRouter()
  const { eventGroups, totalAmount, totalQuantity, setItemQuantity, removeItem, clearCart } = useCart()

  const handleCheckout = (eventId: string) => {
    router.push(`/checkout?eventId=${eventId}&from=cart`)
  }

  return (
    <main style={{ padding: '2rem 1rem', maxWidth: '1100px', margin: '0 auto' }}>
      <BackButton href="/eventos" style={{ marginBottom: '1rem' }} />
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ marginBottom: '0.5rem', fontSize: '2rem', color: '#0f172a' }}>Carrinho</h1>
        <p style={{ color: '#64748b' }}>
          {totalQuantity === 0
            ? 'Seu carrinho está vazio.'
            : `${totalQuantity} ingressos em ${eventGroups.length} evento(s)`}
        </p>
      </header>

      {totalQuantity === 0 ? (
        <section
          style={{
            padding: '2rem',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            background: '#fff',
          }}
        >
          <p style={{ marginBottom: '1rem', color: '#64748b' }}>
            Ainda não há nada no carrinho. Escolha um evento para adicionar ingressos.
          </p>
          <Link
            href="/eventos"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#0f172a',
              color: '#fff',
              padding: '0.75rem 1.25rem',
              borderRadius: '10px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Ver eventos
          </Link>
        </section>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {eventGroups.map((group) => (
            <section
              key={group.eventId}
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '16px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  padding: '1.25rem 1.25rem 1rem',
                  borderBottom: '1px solid #e5e7eb',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    {formatDate(group.eventDate)}
                  </p>
                  <h2 style={{ marginBottom: '0.35rem', fontSize: '1.35rem', color: '#0f172a' }}>
                    {group.eventTitle}
                  </h2>
                  <p style={{ color: '#64748b' }}>{group.eventLocation}</p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#64748b', fontSize: '0.875rem' }}>Subtotal</p>
                  <p style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
                    {formatCurrency(group.totalAmount)}
                  </p>
                </div>
              </div>

              <div style={{ padding: '1.25rem', display: 'grid', gap: '0.85rem' }}>
                {group.items.map((item) => (
                  <article
                    key={item.ticketTypeId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      padding: '1rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: 700 }}>{item.ticketTypeName}</h3>
                        {item.batchName && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}>
                            🎫 {item.batchName}
                          </span>
                        )}
                      </div>
                      <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem', marginBottom: 0 }}>
                        {formatCurrency(item.unitPrice)}
                        {item.available <= 0 ? ' • Sem vagas disponíveis' : ''}
                      </p>
                      {item.quantity >= item.available && item.available > 0 && (
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#475569',
                          fontWeight: 600,
                          margin: '0.35rem 0 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: '#f1f5f9',
                          padding: '0.35rem 0.6rem',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                        }}>
                          <span style={{ fontSize: '0.9rem' }}>ℹ️</span>
                          <span>
                            Limite disponível atingido ({item.available} {item.available === 1 ? 'ingresso disponível' : 'ingressos disponíveis'}{item.batchName ? ` no ${item.batchName}` : ''}).
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setItemQuantity(item.eventId, item.ticketTypeId, item.quantity - 1)}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          border: '1px solid #d1d5db',
                          background: '#fff',
                          cursor: 'pointer',
                          fontSize: '1rem',
                        }}
                      >
                        -
                      </button>
                      <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 600 }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setItemQuantity(item.eventId, item.ticketTypeId, item.quantity + 1)}
                        disabled={item.available <= 0 || item.quantity >= item.available}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          border: '1px solid #d1d5db',
                          background: (item.available > 0 && item.quantity < item.available) ? '#fff' : '#f8fafc',
                          color: (item.available > 0 && item.quantity < item.available) ? '#0f172a' : '#cbd5e1',
                          cursor: (item.available > 0 && item.quantity < item.available) ? 'pointer' : 'not-allowed',
                          fontSize: '1rem',
                        }}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.eventId, item.ticketTypeId)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontWeight: 600,
                          marginLeft: '0.35rem',
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  </article>
                ))}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    alignItems: 'center',
                    paddingTop: '0.25rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleCheckout(group.eventId)}
                    style={{
                      border: 'none',
                      background: '#0f172a',
                      color: '#fff',
                      padding: '0.85rem 1.2rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    Finalizar compra deste evento
                  </button>

                  <Link href={`/eventos/${group.eventSlug}`} style={{ color: '#0f172a', fontWeight: 600 }}>
                    Adicionar mais ingressos
                  </Link>
                </div>
              </div>
            </section>
          ))}

          <section
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.25rem',
              border: '1px solid #0f172a',
              borderRadius: '16px',
              background: '#0f172a',
              color: '#fff',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <p style={{ marginBottom: '0.35rem', opacity: 0.8 }}>Total do carrinho</p>
              <p style={{ fontSize: '1.65rem', fontWeight: 800 }}>{formatCurrency(totalAmount)}</p>
            </div>

            <button
              type="button"
              onClick={clearCart}
              style={{
                border: '1px solid rgba(255,255,255,0.35)',
                background: 'transparent',
                color: '#fff',
                padding: '0.75rem 1.1rem',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Limpar carrinho
            </button>
          </section>
        </div>
      )}
    </main>
  )
}
'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useCheckout } from '../hooks/useCheckout'
import { useCart } from '@/features/cart/cart-context'

interface CheckoutFormProps {
  eventId: string
  from?: string
  slug?: string
}

interface DirectCheckoutSelection {
  eventId: string
  eventSlug: string
  items: Array<{
    ticketTypeId: string
    quantity: number
    unitPrice: number
  }>
}

/** Valida CPF brasileiro (11 dígitos + dígitos verificadores) */
function isValidCpf(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11 || /^(\d)\1+$/.test(clean)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i)
  let r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  if (r !== parseInt(clean[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i)
  r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  return r === parseInt(clean[10])
}

/** Formata CPF enquanto digita: 000.000.000-00 */
function formatCpf(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function CheckoutForm({ eventId, from, slug }: CheckoutFormProps) {
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
    hydrateSelectedItems,
    updateNomineeName,
    updateNomineeCpf,
    handleSubmit,
  } = useCheckout()
  const router = useRouter()
  const { getItemsForEvent } = useCart()
  const hydratedFromCartRef = useRef(false)
  const hydratedFromDirectCheckoutRef = useRef(false)

  // Determinar o modo de identificação do evento
  const ticketLayout = event?.ticket_layout ?? 'ticket'
  const participantIdType = event?.participant_id_type ?? 'name'
  // formal_pdf → nome + CPF obrigatórios
  // ticket 'name' → campo de nome opcional (se vazio → usa nome do comprador)
  // ticket 'none' → sem campos de identificação (ingresso transferível)
  const requiresName = ticketLayout === 'formal_pdf' || participantIdType === 'name' || participantIdType === 'name_cpf'
  const requiresCpf = ticketLayout === 'formal_pdf'

  useEffect(() => {
    loadCheckout(eventId)
  }, [eventId, loadCheckout])

  useEffect(() => {
    if (from !== 'event' || hydratedFromDirectCheckoutRef.current || !event) {
      return
    }

    const storageKey = `mypass360-direct-checkout:${eventId}`
    const storedSelection = window.sessionStorage.getItem(storageKey)

    if (!storedSelection) {
      return
    }

    try {
      const parsed = JSON.parse(storedSelection) as DirectCheckoutSelection

      if (parsed.eventId !== eventId) {
        return
      }

      const validTicketTypes = new Set(ticketTypes.map((ticketType) => ticketType.id))
      const directItems = parsed.items.filter((item) => validTicketTypes.has(item.ticketTypeId))

      if (directItems.length === 0) {
        return
      }

      hydrateSelectedItems(directItems)
      hydratedFromDirectCheckoutRef.current = true
    } catch {
      window.sessionStorage.removeItem(storageKey)
    }
  }, [event, eventId, from, hydrateSelectedItems, ticketTypes])

  useEffect(() => {
    if (from === 'event' || !event || ticketTypes.length === 0 || hydratedFromCartRef.current) {
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
  }, [event, eventId, from, getItemsForEvent, setTicketQuantity, ticketTypes])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // Validação de CPF para formal_pdf
    if (requiresCpf) {
      for (const item of selectedItems) {
        const cpfs = item.nomineeCpfs ?? []
        for (let i = 0; i < item.quantity; i++) {
          const cpf = cpfs[i] ?? ''
          if (!cpf.trim()) {
            alert(`Ingresso #${i + 1}: CPF é obrigatório.`)
            return
          }
          if (!isValidCpf(cpf)) {
            alert(`Ingresso #${i + 1}: CPF inválido. Verifique e tente novamente.`)
            return
          }
        }
      }
    }

    // Validação de nome obrigatório para formal_pdf
    if (requiresCpf) {
      for (const item of selectedItems) {
        const names = item.nomineeNames ?? []
        for (let i = 0; i < item.quantity; i++) {
          if (!names[i]?.trim()) {
            alert(`Ingresso #${i + 1}: Nome completo é obrigatório.`)
            return
          }
        }
      }
    }

    const result = await handleSubmit(eventId)

    if (result?.orderId) {
      if (from === 'event') {
        window.sessionStorage.removeItem(`mypass360-direct-checkout:${eventId}`)
      }

      const params = new URLSearchParams({
        orderId: result.orderId,
        eventId,
        amount: String(result.amount),
      })
      if (from) params.append('from', from)
      if (slug) params.append('slug', slug)

      router.push(`/checkout/pagamento?${params.toString()}`)
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
  const visibleTicketTypes = ticketTypes.filter((ticketType) => (selectedById.get(ticketType.id) ?? 0) > 0)

  const inputStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.875rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease',
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
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

        {/* Badge de modelo de ingresso */}
        {ticketLayout === 'formal_pdf' && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            color: '#0369a1',
            fontWeight: 600,
            marginTop: '0.5rem',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            PDF Formal — nome e CPF obrigatórios por ingresso
          </div>
        )}
      </header>

      {ticketTypes.length === 0 ? (
        <p>Esse evento ainda não possui tipos de ingresso cadastrados.</p>
      ) : visibleTicketTypes.length === 0 ? (
        <p>Nenhum ingresso foi selecionado para esta compra.</p>
      ) : (
        <section style={{ display: 'grid', gap: '0.75rem' }}>
          {visibleTicketTypes.map((ticketType) => {
            const quantity = selectedById.get(ticketType.id) ?? 0
            const available = Math.max(ticketType.quantity - ticketType.sold, 0)
            const itemState = selectedItems.find((item) => item.ticketTypeId === ticketType.id)
            const nomineeNames = itemState?.nomineeNames ?? []
            const nomineeCpfs = itemState?.nomineeCpfs ?? []

            return (
              <article
                key={ticketType.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '0.85rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', width: '100%' }}>
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
                      style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
                    >
                      -
                    </button>
                    <span style={{ minWidth: '24px', textAlign: 'center' }}>{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setTicketQuantity(ticketType, Math.min(quantity + 1, available))}
                      style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Campos de identificação do participante */}
                {quantity > 0 && requiresName && (
                  <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', margin: 0 }}>
                      {requiresCpf ? '🪪 Identificação do Participante (obrigatória)' : 'Nome do Portador (Opcional)'}
                    </p>
                    {Array.from({ length: quantity }).map((_, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: requiresCpf ? '#f8fafc' : 'transparent', borderRadius: '8px', padding: requiresCpf ? '0.75rem' : '0' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', margin: 0 }}>
                          Ingresso #{idx + 1}
                        </p>
                        <div style={{ display: 'grid', gap: '0.4rem', gridTemplateColumns: requiresCpf ? '1fr 1fr' : '1fr' }}>
                          {/* Nome */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <label htmlFor={`nominee-name-${ticketType.id}-${idx}`} style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                              NOME COMPLETO{requiresCpf ? ' *' : ''}
                            </label>
                            <input
                              id={`nominee-name-${ticketType.id}-${idx}`}
                              type="text"
                              value={nomineeNames[idx] ?? ''}
                              onChange={(e) => updateNomineeName(ticketType.id, idx, e.target.value)}
                              placeholder="Nome completo"
                              required={requiresCpf}
                              style={inputStyle}
                            />
                          </div>

                          {/* CPF — apenas para formal_pdf */}
                          {requiresCpf && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <label htmlFor={`nominee-cpf-${ticketType.id}-${idx}`} style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                                CPF *
                              </label>
                              <input
                                id={`nominee-cpf-${ticketType.id}-${idx}`}
                                type="text"
                                value={nomineeCpfs[idx] ?? ''}
                                onChange={(e) => updateNomineeCpf(ticketType.id, idx, formatCpf(e.target.value))}
                                placeholder="000.000.000-00"
                                required
                                maxLength={14}
                                style={{
                                  ...inputStyle,
                                  borderColor: nomineeCpfs[idx] && nomineeCpfs[idx].replace(/\D/g, '').length === 11
                                    ? isValidCpf(nomineeCpfs[idx]) ? '#22c55e' : '#ef4444'
                                    : '#cbd5e1',
                                }}
                              />
                              {nomineeCpfs[idx] && nomineeCpfs[idx].replace(/\D/g, '').length === 11 && !isValidCpf(nomineeCpfs[idx]) && (
                                <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>CPF inválido</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

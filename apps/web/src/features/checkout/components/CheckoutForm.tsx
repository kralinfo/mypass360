'use client'

import { useCheckout } from '../hooks/useCheckout'

export function CheckoutForm() {
  const { isLoading, error, handleSubmit } = useCheckout()

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // TODO: coletar dados do carrinho e chamar handleSubmit
    await handleSubmit({ eventId: '', items: [] })
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Processando...' : 'Finalizar compra'}
      </button>
    </form>
  )
}

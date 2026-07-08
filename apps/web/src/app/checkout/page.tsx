import { CheckoutForm } from '@/features/checkout/components/CheckoutForm'

interface CheckoutPageProps {
  searchParams: Promise<{ eventId?: string }>
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { eventId } = await searchParams

  if (!eventId) {
    return (
      <main style={{ padding: '2rem', maxWidth: '760px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '0.75rem' }}>Finalizar compra</h1>
        <p>Evento não informado. Volte para a listagem e selecione um evento.</p>
      </main>
    )
  }

  return (
    <main style={{ padding: '2rem 1rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>Finalizar compra</h1>
      <CheckoutForm eventId={eventId} />
    </main>
  )
}

import { CheckoutForm } from '@/features/checkout/components/CheckoutForm'
import { BackButton } from '@/components/BackButton'

interface CheckoutPageProps {
  searchParams: Promise<{ eventId?: string; from?: string; slug?: string }>
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { eventId, from, slug } = await searchParams

  if (!eventId) {
    return (
      <main style={{ padding: '2rem', maxWidth: '760px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '0.75rem' }}>Finalizar compra</h1>
        <p>Evento não informado. Volte para a listagem e selecione um evento.</p>
      </main>
    )
  }

  const backHref = from === 'event' && slug ? `/eventos/${slug}` : '/carrinho'

  return (
    <main style={{ padding: '2rem 1rem', maxWidth: '900px', margin: '0 auto' }}>
      <BackButton href={backHref} style={{ marginBottom: '1rem' }} />
      <h1 style={{ marginBottom: '1rem' }}>Finalizar compra</h1>
      <CheckoutForm eventId={eventId} from={from} slug={slug} />
    </main>
  )
}

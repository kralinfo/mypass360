import { CheckoutForm } from '@/features/checkout/components/CheckoutForm'
import { BackButton } from '@/components/BackButton'
import { CheckoutFallback } from '@/features/checkout/components/CheckoutFallback'

interface CheckoutPageProps {
  searchParams: Promise<{ eventId?: string; from?: string; slug?: string }>
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { eventId, from, slug } = await searchParams

  if (!eventId) {
    return <CheckoutFallback />
  }

  const backHref = from === 'event' && slug ? `/eventos/${slug}` : '/carrinho'

  return (
    <main style={{ padding: '2rem 1rem', maxWidth: '900px', margin: '0 auto' }}>
      <BackButton href={backHref} style={{ marginBottom: '1rem' }} />
      <h1 style={{ marginBottom: '1rem' }}>Confirmar pedido</h1>
      <CheckoutForm eventId={eventId} from={from} slug={slug} />
    </main>
  )
}

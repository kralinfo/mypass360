import { PaymentStatusCard } from '@/features/checkout/components/PaymentStatusCard'

interface CheckoutPaymentPageProps {
  searchParams: Promise<{ paymentId?: string; orderId?: string; eventId?: string; amount?: string }>
}

export default async function CheckoutPaymentPage({ searchParams }: CheckoutPaymentPageProps) {
  const { paymentId, orderId, eventId, amount } = await searchParams

  if (!orderId || !eventId || !amount) {
    return (
      <main style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
        <h1>Pagamento</h1>
        <p>Informações insuficientes para carregar o pagamento.</p>
      </main>
    )
  }

  return (
    <main style={{ padding: '2rem 1rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>Pagamento via PIX</h1>
      <PaymentStatusCard
        paymentId={paymentId}
        orderId={orderId}
        eventId={eventId}
        amount={Number(amount)}
      />
    </main>
  )
}
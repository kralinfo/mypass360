import { PaymentStatusCard } from '@/features/checkout/components/PaymentStatusCard'
import { BackButton } from '@/components/BackButton'

interface CheckoutPaymentPageProps {
  searchParams: Promise<{ paymentId?: string; orderId?: string; eventId?: string; amount?: string; from?: string; slug?: string }>
}

export default async function CheckoutPaymentPage({ searchParams }: CheckoutPaymentPageProps) {
  const { paymentId, orderId, eventId, amount, from, slug } = await searchParams

  // Só orderId é obrigatório: eventId/amount são usados apenas na tela de criação
  // de um pagamento novo. Ao voltar para conferir um pagamento já existente
  // (ex: botão "Ver pagamento" do banner de pendência), o PaymentStatusCard busca
  // os dados reais do pagamento pelo orderId.
  if (!orderId) {
    return (
      <main style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
        <h1>Pagamento</h1>
        <p>Informações insuficientes para carregar o pagamento.</p>
      </main>
    )
  }

  const backHref = from === 'event' && slug ? `/eventos/${slug}` : '/carrinho'

  return (
    <main style={{ padding: '2rem 1rem', maxWidth: '900px', margin: '0 auto' }}>
      <BackButton href={backHref} style={{ marginBottom: '1rem' }} />
      <h1 style={{ marginBottom: '1rem' }}>Pagamento via PIX</h1>
      <PaymentStatusCard
        paymentId={paymentId}
        orderId={orderId}
        eventId={eventId ?? ''}
        amount={Number(amount ?? 0)}
      />
    </main>
  )
}
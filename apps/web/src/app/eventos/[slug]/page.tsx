import { fetchEventBySlug } from '@/features/events/services/events.service'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface EventDetailPageProps {
  params: Promise<{ slug: string }>
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug } = await params
  
  let event
  try {
    event = await fetchEventBySlug(slug)
  } catch (err) {
    console.error('Failed to fetch event:', err)
    return (
      <main>
        <h1>Erro ao carregar evento</h1>
        <p>Não foi possível carregar o evento. Verifique se a API está rodando.</p>
        <Link href="/eventos">Voltar para eventos</Link>
      </main>
    )
  }

  const formattedDate = new Date(event.date).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <main>
      <h1>{event.title}</h1>
      <p>{event.description}</p>
      <time dateTime={event.date}>{formattedDate}</time>
      <p>{event.location}</p>
      <p>
        {event.price === 0
          ? 'Gratuito'
          : event.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
      <Link href="/checkout">Comprar ingressos</Link>
    </main>
  )
}

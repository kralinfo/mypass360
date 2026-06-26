'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Event } from '@mypass360/types'
import { fetchPublishedEventBySlug } from '@/features/events/services/supabase-events.service'

interface EventDetailPageProps {
  params: Promise<{ slug: string }>
}

export default function EventDetailPage({ params }: EventDetailPageProps) {
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    params.then(({ slug }) => {
      fetchPublishedEventBySlug(slug)
        .then((data) => {
          if (data) {
            setEvent(data)
          } else {
            setError('Evento não encontrado')
          }
        })
        .catch(() => {
          setError('Erro ao carregar evento')
        })
        .finally(() => setIsLoading(false))
    })
  }, [params])

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

  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div
        style={{
          height: '200px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '3rem',
          marginBottom: '1.5rem',
        }}
      >
        🎵
      </div>

      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>{event.title}</h1>

      <div
        style={{
          display: 'flex',
          gap: '2rem',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
          padding: '1rem',
          background: '#f8fafc',
          borderRadius: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>📅</span>
          <time dateTime={event.date}>{formattedDate}</time>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>📍</span>
          <span>{event.location}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>👥</span>
          <span>{event.capacity.toLocaleString('pt-BR')} lugares</span>
        </div>
      </div>

      <p style={{ color: '#64748b', lineHeight: '1.7', marginBottom: '2rem' }}>
        {event.description}
      </p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem',
          background: '#0f172a',
          borderRadius: '12px',
          color: '#fff',
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.8 }}>Preço a partir de</p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '1.5rem', fontWeight: 'bold' }}>
            {formattedPrice}
          </p>
        </div>
        <Link
          href={`/checkout?eventId=${event.id}`}
          style={{
            background: '#fff',
            color: '#0f172a',
            padding: '0.75rem 2rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600',
          }}
        >
          Comprar ingressos
        </Link>
      </div>
    </main>
  )
}

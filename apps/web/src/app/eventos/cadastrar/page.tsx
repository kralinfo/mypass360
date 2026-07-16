'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BackButton } from '@/components/BackButton'

export default function CadastrarEventoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    date: '',
    time: '',
    location: '',
    capacity: '',
    price: '',
    ticketTypes: [
      { name: 'Inteira', price: '', quantity: '0', description: '' },
      { name: 'Meia-entrada', price: '', quantity: '0', description: '' },
    ],
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    if (name === 'title') {
      const slug = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

      setFormData((prev) => ({ ...prev, title: value, slug }))
      return
    }

    if (name === 'price') {
      const parsedPrice = Number(value)
      setFormData((prev) => ({
        ...prev,
        price: value,
        ticketTypes: prev.ticketTypes.map((ticketType) => {
          const lowerName = ticketType.name.toLowerCase()
          if (lowerName.includes('inteira')) {
            return { ...ticketType, price: value }
          }
          if (lowerName.includes('meia')) {
            return {
              ...ticketType,
              price: Number.isFinite(parsedPrice) ? (parsedPrice / 2).toFixed(2) : ticketType.price,
            }
          }
          return ticketType
        }),
      }))
      return
    }

    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleTicketTypeChange = (
    index: number,
    field: 'name' | 'price' | 'quantity' | 'description',
    value: string
  ) => {
    setFormData((prev) => {
      const ticketTypes = [...prev.ticketTypes]
      ticketTypes[index] = { ...ticketTypes[index], [field]: value }
      return { ...prev, ticketTypes }
    })
  }

  const addTicketType = () => {
    setFormData((prev) => ({
      ...prev,
      ticketTypes: [...prev.ticketTypes, { name: '', price: '', quantity: '0', description: '' }],
    }))
  }

  const removeTicketType = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      ticketTypes: prev.ticketTypes.filter((_, ticketIndex) => ticketIndex !== index),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Obter usuário logado
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('Você precisa estar logado para cadastrar um evento')
        setLoading(false)
        return
      }

      // Combinar data e hora
      const dateTime = `${formData.date}T${formData.time}:00`

      // Enviar para o backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug,
          description: formData.description,
          date: dateTime,
          location: formData.location,
          organizer_id: user.id,
          capacity: parseInt(formData.capacity, 10),
          price: formData.price ? parseFloat(formData.price) : 0,
          status: 'published',
          ticket_types: formData.ticketTypes
            .filter((ticketType) => ticketType.name.trim().length > 0)
            .map((ticketType) => ({
              name: ticketType.name.trim(),
              price: parseFloat(ticketType.price) || 0,
              quantity: parseInt(ticketType.quantity, 10) || 0,
              description: ticketType.description?.trim() || null,
            })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao cadastrar evento')
      }

      // Redirecionar para a lista de eventos
      router.push('/eventos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar evento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', paddingTop: '5rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <BackButton href="/eventos" style={{ marginBottom: '1rem' }} />
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', color: '#0f172a' }}>
          Cadastrar Novo Evento
        </h1>

        {error && (
          <div
            style={{
              padding: '1rem',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '8px',
              marginBottom: '1.5rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label htmlFor="title" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#334155' }}>
              Título do Evento *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
              placeholder="Ex: Festival de Música 2026"
            />
          </div>

          <div>
            <label htmlFor="slug" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#334155' }}>
              URL (Slug) *
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
              placeholder="festival-de-musica-2026"
            />
            <small style={{ color: '#64748b', fontSize: '0.875rem' }}>
              URL amigável gerada automaticamente a partir do título
            </small>
          </div>

          <div>
            <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#334155' }}>
              Descrição *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '1rem',
                resize: 'vertical',
              }}
              placeholder="Descreva o evento..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label htmlFor="date" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#334155' }}>
                Data *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div>
              <label htmlFor="time" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#334155' }}>
                Horário *
              </label>
              <input
                type="time"
                id="time"
                name="time"
                value={formData.time}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="location" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#334155' }}>
              Local *
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
              placeholder="Ex: São Paulo, SP — Allianz Parque"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label htmlFor="capacity" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#334155' }}>
                Capacidade *
              </label>
              <input
                type="number"
                id="capacity"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                required
                min="1"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
                placeholder="1000"
              />
            </div>

            <div>
              <label htmlFor="price" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#334155' }}>
                Preço (R$)
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="0.01"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
                placeholder="150.00"
              />
            </div>
          </div>

          <section style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Tipos de ingresso</h2>
                <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.95rem' }}>
                  Adicione os ingressos disponíveis para o evento. Inclua meia entrada se houver.
                </p>
              </div>
              <button
                type="button"
                onClick={addTicketType}
                style={{
                  background: '#0f172a',
                  color: '#fff',
                  padding: '0.55rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                + Novo tipo
              </button>
            </div>

            {formData.ticketTypes.map((ticketType, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  padding: '1rem',
                  borderRadius: '10px',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}>
                  <label style={{ margin: 0, fontWeight: 600, color: '#334155' }}>Tipo de ingresso</label>
                  <button
                    type="button"
                    onClick={() => removeTicketType(index)}
                    style={{
                      padding: '0.5rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      color: '#ef4444',
                      cursor: 'pointer',
                    }}
                  >
                    Remover
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <input
                    type="text"
                    value={ticketType.name}
                    onChange={(event) => handleTicketTypeChange(index, 'name', event.target.value)}
                    placeholder="Nome do tipo de ingresso"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                    }}
                  />
                  <input
                    type="number"
                    value={ticketType.price}
                    onChange={(event) => handleTicketTypeChange(index, 'price', event.target.value)}
                    min="0"
                    step="0.01"
                    placeholder="Preço"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                    }}
                  />
                  <input
                    type="number"
                    value={ticketType.quantity}
                    onChange={(event) => handleTicketTypeChange(index, 'quantity', event.target.value)}
                    min="0"
                    placeholder="Quantidade"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                    }}
                  />
                </div>
                <textarea
                  value={ticketType.description || ''}
                  onChange={(event) => handleTicketTypeChange(index, 'description', event.target.value)}
                  placeholder="Descrição opcional do tipo de ingresso (ex: apresentar carteira de estudante)"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    resize: 'vertical',
                  }}
                />
              </div>
            ))}
          </section>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.875rem 2rem',
                background: loading ? '#94a3b8' : '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Evento'}
            </button>

            <button
              type="button"
              onClick={() => router.push('/eventos')}
              disabled={loading}
              style={{
                padding: '0.875rem 2rem',
                background: '#fff',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

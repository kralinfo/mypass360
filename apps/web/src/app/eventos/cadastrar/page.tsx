'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BackButton } from '@/components/BackButton'
import { createEvent, updateEvent, fetchEventById } from '@/features/events/services/my-events.service'
import { EventCoverUploader } from '@/features/events/components/EventCoverUploader'

function CadastrarEventoForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const isEditMode = Boolean(editId)

  const [loading, setLoading] = useState(false)
  const [loadingEvent, setLoadingEvent] = useState(isEditMode)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    imageUrl: '',
    genre: '',
    date: '',
    time: '',
    location: '',
    capacity: '',
    price: '',
    ticketLayout: '' as '' | 'ticket' | 'formal_pdf',
    participantIdType: '' as '' | 'none' | 'name',
    ticketTypes: [
      { name: 'Inteira', price: '', quantity: '0', description: '' },
      { name: 'Meia-entrada', price: '', quantity: '0', description: '' },
    ],
  })

  // Carregar dados do evento em modo edição
  useEffect(() => {
    if (!editId) return

    async function loadEvent() {
      setLoadingEvent(true)
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          router.push('/login?next=/meus-eventos')
          return
        }

        const event = await fetchEventById(editId!, session.access_token)

        // Extrair data e hora separadamente
        const eventDate = new Date(event.date)
        const dateStr = eventDate.toISOString().split('T')[0]
        const timeStr = eventDate.toTimeString().slice(0, 5)

        // Se o evento já tiver ticket_types, carrega do banco. Caso contrário, inicia vazios/padrão
        const mappedTicketTypes = event.ticket_types && event.ticket_types.length > 0
          ? event.ticket_types.map((tt: { name: string; price: number; quantity: number; description?: string }) => ({
              name: tt.name,
              price: String(tt.price),
              quantity: String(tt.quantity),
              description: tt.description ?? '',
            }))
          : [
              { name: 'Inteira', price: String(event.price), quantity: '0', description: '' },
              {
                name: 'Meia-entrada',
                price: String(event.price / 2),
                quantity: '0',
                description: '',
              },
            ]

        setFormData({
          title: event.title,
          slug: event.slug,
          description: event.description ?? '',
          imageUrl: event.image_url ?? '',
          genre: event.genre ?? '',
          date: dateStr,
          time: timeStr,
          location: event.location,
          capacity: String(event.capacity),
          price: String(event.price),
          ticketLayout: (event.ticket_layout ?? '') as '' | 'ticket' | 'formal_pdf',
          participantIdType: (event.participant_id_type === 'name_cpf' ? '' : (event.participant_id_type ?? '')) as '' | 'none' | 'name',
          ticketTypes: mappedTicketTypes,
        })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar evento')
      } finally {
        setLoadingEvent(false)
      }
    }

    void loadEvent()
  }, [editId, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

    // Validação: modelo de ingresso obrigatório
    if (!formData.ticketLayout) {
      setError('Selecione o modelo de ingresso (Ticket ou PDF Formal).')
      setLoading(false)
      return
    }

    if (formData.ticketLayout === 'ticket' && !formData.participantIdType) {
      setError('Selecione o tipo de identificação do participante (Sem nome ou Com nome).')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        setError('Você precisa estar logado para gerenciar eventos')
        setLoading(false)
        return
      }

      const token = session.access_token
      const dateTime = `${formData.date}T${formData.time}:00`

      const payload = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        image_url: formData.imageUrl || null,
        genre: formData.genre || null,
        date: dateTime,
        location: formData.location,
        capacity: parseInt(formData.capacity, 10),
        price: formData.price ? parseFloat(formData.price) : 0,
        ticket_layout: formData.ticketLayout,
        participant_id_type: formData.ticketLayout === 'formal_pdf' ? 'name_cpf' : formData.participantIdType,
        ticket_types: formData.ticketTypes
          .filter((ticketType) => ticketType.name.trim().length > 0)
          .map((ticketType) => ({
            name: ticketType.name.trim(),
            price: parseFloat(ticketType.price) || 0,
            quantity: parseInt(ticketType.quantity, 10) || 0,
            description: ticketType.description?.trim() || null,
          })),
      }

      if (isEditMode && editId) {
        await updateEvent(editId, token, payload)
      } else {
        await createEvent(token, { ...payload, status: 'draft' })
      }

      router.push('/meus-eventos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar evento')
    } finally {
      setLoading(false)
    }
  }

  if (loadingEvent) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', paddingTop: 0 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem 1rem 1.5rem' }}>
          <p style={{ color: '#64748b', textAlign: 'center' }}>Carregando evento...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', paddingTop: 0 }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem 1rem 1.5rem' }}>
        <BackButton href={isEditMode ? '/meus-eventos' : '/eventos'} style={{ marginBottom: '1rem' }} />
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1.25rem', color: '#0f172a', letterSpacing: '-0.02em' }}>
          {isEditMode ? 'Editar Evento' : 'Cadastrar Novo Evento'}
        </h1>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Uploader de Foto de Capa do Evento com Ajuste Interativo */}
          <EventCoverUploader
            value={formData.imageUrl}
            onChange={(url) => setFormData((prev) => ({ ...prev, imageUrl: url ?? '' }))}
            eventId={editId ?? undefined}
          />

          <div>
            <label htmlFor="title" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500', color: '#334155' }}>
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
                padding: '0.6rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
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
                padding: '0.6rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
              }}
              placeholder="festival-de-musica-2026"
            />
            <small style={{ color: '#64748b', fontSize: '0.85rem' }}>
              URL amigável gerada automaticamente a partir do título
            </small>
          </div>

          <div>
            <label htmlFor="description" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500', color: '#334155' }}>
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
                padding: '0.6rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.95rem',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
              placeholder="Descreva o evento..."
            />
          </div>

          <div>
            <label htmlFor="genre" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500', color: '#334155' }}>
              Gênero / Categoria *
            </label>
            <select
              id="genre"
              name="genre"
              value={formData.genre}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.95rem',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            >
              <option value="">Selecione um gênero...</option>
              <option value="Música">Música</option>
              <option value="Festival">Festival</option>
              <option value="Esportes">Esportes</option>
              <option value="Teatro">Teatro</option>
              <option value="Gastronomia">Gastronomia</option>
              <option value="Cultura">Cultura</option>
              <option value="Tech">Tech</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label htmlFor="date" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500', color: '#334155' }}>
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
                  padding: '0.6rem 0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label htmlFor="time" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500', color: '#334155' }}>
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
                  padding: '0.6rem 0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="location" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500', color: '#334155' }}>
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
                padding: '0.6rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
              }}
              placeholder="Ex: São Paulo, SP — Allianz Parque"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label htmlFor="capacity" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500', color: '#334155' }}>
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
                  padding: '0.6rem 0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                }}
                placeholder="1000"
              />
            </div>

            <div>
              <label htmlFor="price" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500', color: '#334155' }}>
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
                  padding: '0.6rem 0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
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
                  gap: '0.6rem',
                  marginBottom: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}>
                  <label style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>Tipo de ingresso</label>
                  <button
                    type="button"
                    onClick={() => removeTicketType(index)}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      color: '#ef4444',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    Remover
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <input
                    type="text"
                    value={ticketType.name}
                    onChange={(event) => handleTicketTypeChange(index, 'name', event.target.value)}
                    placeholder="Nome do tipo"
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
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
                      padding: '0.6rem 0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="number"
                    value={ticketType.quantity}
                    onChange={(event) => handleTicketTypeChange(index, 'quantity', event.target.value)}
                    min="0"
                    placeholder="Qtd"
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <textarea
                  value={ticketType.description || ''}
                  onChange={(event) => handleTicketTypeChange(index, 'description', event.target.value)}
                  placeholder="Descrição opcional"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
          </section>

          {/* Seção: Modelo do Ingresso */}
          <section style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', opacity: isEditMode ? 0.8 : 1 }}>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', color: '#0f172a' }}>
              Modelo do Ingresso <span style={{ color: '#ef4444' }}>*</span>
            </h2>
            <p style={{ margin: '0 0 1rem', color: '#64748b', fontSize: '0.95rem' }}>
              Define a aparência e as informações exigidas do participante na compra.
              {isEditMode && (
                <span style={{ display: 'block', color: '#b45309', fontWeight: 600, marginTop: '0.25rem' }}>
                  ⚠️ O modelo do ingresso não pode ser alterado após a criação do evento.
                </span>
              )}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Ticket */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: `2px solid ${formData.ticketLayout === 'ticket' ? '#0f172a' : '#e2e8f0'}`,
                  background: formData.ticketLayout === 'ticket' ? '#f8fafc' : '#fff',
                  cursor: isEditMode ? 'not-allowed' : 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="ticketLayout"
                  value="ticket"
                  checked={formData.ticketLayout === 'ticket'}
                  disabled={isEditMode}
                  onChange={() => setFormData(prev => ({ ...prev, ticketLayout: 'ticket', participantIdType: '' }))}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <p style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 0.2rem' }}>🎫 Ticket</p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    Ingresso compacto no estilo ticket físico com QR Code. Modelo padrão.
                  </p>
                  {/* Sub-opção de identificação */}
                  {formData.ticketLayout === 'ticket' && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '0.5rem', borderLeft: '3px solid #e2e8f0' }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', margin: 0 }}>
                        Identificação do Participante <span style={{ color: '#ef4444' }}>*</span>
                      </p>
                      {[
                        { value: 'none', label: 'Sem nome', desc: 'Ingresso transferível, sem identificação' },
                        { value: 'name', label: 'Com nome (opcional)', desc: 'Comprador pode informar o nome do portador' },
                      ].map(opt => (
                        <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: isEditMode ? 'not-allowed' : 'pointer', padding: '0.5rem 0.75rem', borderRadius: '8px', background: formData.participantIdType === opt.value ? '#f0fdf4' : '#fff', border: `1px solid ${formData.participantIdType === opt.value ? '#bbf7d0' : '#e2e8f0'}` }}>
                          <input
                            type="radio"
                            name="participantIdType"
                            value={opt.value}
                            checked={formData.participantIdType === opt.value}
                            disabled={isEditMode}
                            onChange={() => setFormData(prev => ({ ...prev, participantIdType: opt.value as 'none' | 'name' }))}
                            style={{ marginTop: '2px' }}
                          />
                          <div>
                            <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>{opt.label}</p>
                            <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </label>

              {/* PDF Formal */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: `2px solid ${formData.ticketLayout === 'formal_pdf' ? '#0369a1' : '#e2e8f0'}`,
                  background: formData.ticketLayout === 'formal_pdf' ? '#f0f9ff' : '#fff',
                  cursor: isEditMode ? 'not-allowed' : 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="ticketLayout"
                  value="formal_pdf"
                  checked={formData.ticketLayout === 'formal_pdf'}
                  disabled={isEditMode}
                  onChange={() => setFormData(prev => ({ ...prev, ticketLayout: 'formal_pdf', participantIdType: '' }))}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <p style={{ fontWeight: 700, color: '#0369a1', margin: '0 0 0.2rem' }}>📄 PDF Formal</p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    PDF A4 profissional com nome e CPF obrigatórios por ingresso. Ideal para eventos corporativos e seminários.
                  </p>
                  {formData.ticketLayout === 'formal_pdf' && (
                    <p style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: 600, margin: '0.5rem 0 0', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Nome completo e CPF serão solicitados para cada ingresso no checkout
                    </p>
                  )}
                </div>
              </label>
            </div>
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
              {loading
                ? isEditMode
                  ? 'Salvando...'
                  : 'Cadastrando...'
                : isEditMode
                  ? 'Salvar Alterações'
                  : 'Cadastrar Evento'}
            </button>

            <button
              type="button"
              onClick={() => router.push(isEditMode ? '/meus-eventos' : '/eventos')}
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

export default function CadastrarEventoPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#f8fafc', paddingTop: '5rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
          <p style={{ color: '#64748b' }}>Carregando...</p>
        </div>
      </div>
    }>
      <CadastrarEventoForm />
    </Suspense>
  )
}

'use client'

import { useState, useEffect } from 'react'
import type { AdminEventItem, } from '@mypass360/types'
import type { EventStatus } from '@mypass360/types'
import { createClient } from '@/lib/supabase/client'

type TicketTypeEdit = {
  name: string
  price: string
  quantity: string
  description: string
}

type FullEventData = {
  id: string
  title: string
  description?: string
  date: string
  location: string
  city?: string | null
  state?: string | null
  genre?: string | null
  status: string
  event_type?: string
  visibility?: string
  price?: number
  capacity?: number
  ticket_types?: Array<{ name: string; price: number; quantity: number; description?: string }>
  organizer_id?: string
  access_password_hash?: string | null
  has_password?: boolean
}

type AdminEditEventModalProps = {
  event: AdminEventItem
  onClose: () => void
  onSaved?: () => void
}

const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1`

function parseDateAndTime(dateInput?: string | null) {
  if (!dateInput) return { dateStr: '', timeStr: '' }
  try {
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return { dateStr: '', timeStr: '' }
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return {
      dateStr: `${year}-${month}-${day}`,
      timeStr: `${hours}:${minutes}`,
    }
  } catch {
    return { dateStr: '', timeStr: '' }
  }
}

export function AdminEditEventModal({ event, onClose, onSaved }: AdminEditEventModalProps) {
  const [step, setStep] = useState<'loading' | 'edit' | 'confirm'>('loading')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adminMessage, setAdminMessage] = useState('')
  const [token, setToken] = useState<string>('')

  // Gerenciamento de senha de acesso
  const [hasPassword, setHasPassword] = useState(false)
  const [enablePassword, setEnablePassword] = useState(false)
  const [accessPassword, setAccessPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const initialDateObj = parseDateAndTime(event.date)

  const [form, setForm] = useState({
    title: event.title ?? '',
    description: '',
    date: initialDateObj.dateStr,
    time: initialDateObj.timeStr,
    location: event.location ?? '',
    city: '',
    state: '',
    genre: '',
    status: (event.status as EventStatus) ?? 'draft',
    event_type: 'PAID',
    visibility: 'PUBLIC',
    price: String(event.price ?? 0),
    capacity: String(event.capacity ?? 0),
    ticketTypes: [] as TicketTypeEdit[],
  })

  // Buscar dados completos do evento ao abrir o modal
  useEffect(() => {
    async function loadFull() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Sessão expirada.')
        setToken(session.access_token)

        const res = await fetch(`${API_URL}/admin/events/${event.id}/details`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) throw new Error('Erro ao carregar dados do evento.')

        const full: FullEventData = await res.json()
        const { dateStr, timeStr } = parseDateAndTime(full.date ?? event.date)

        // Verificar se o evento tem senha (admin recebe access_password_hash diretamente)
        const eventHasPassword = Boolean((full as any).access_password_hash) || Boolean(full.has_password)
        setHasPassword(eventHasPassword)
        setEnablePassword(eventHasPassword)

        setForm({
          title: full.title ?? '',
          description: full.description ?? '',
          date: dateStr,
          time: timeStr,
          location: full.location ?? '',
          city: full.city ?? '',
          state: full.state ?? '',
          genre: full.genre ?? '',
          status: (full.status as EventStatus) ?? 'draft',
          event_type: full.event_type ?? 'PAID',
          visibility: full.visibility ?? 'PUBLIC',
          price: String(full.price ?? 0),
          capacity: String(full.capacity ?? 0),
          ticketTypes: ((full as any).ticketTypes ?? (full as any).ticket_types ?? []).map((t: any) => ({
            name: t.name,
            price: String(t.price),
            quantity: String(t.quantity),
            description: t.description ?? '',
          })),
        })
        setStep('edit')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar evento.')
        setStep('edit')
      }
    }
    void loadFull()
  }, [event.id, event.date])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleTicketChange = (index: number, field: keyof TicketTypeEdit, value: string) => {
    setForm(prev => {
      const tts = [...prev.ticketTypes]
      tts[index] = { ...tts[index], [field]: value }

      if (field === 'price' || field === 'quantity') {
        const totalCap = tts.reduce((acc, t) => acc + (parseInt(t.quantity, 10) || 0), 0)
        const totalRev = tts.reduce((acc, t) => acc + ((parseFloat(t.price) || 0) * (parseInt(t.quantity, 10) || 0)), 0)
        const avg = totalCap > 0 ? totalRev / totalCap : 0
        return { ...prev, ticketTypes: tts, capacity: String(totalCap), price: avg.toFixed(2) }
      }
      return { ...prev, ticketTypes: tts }
    })
  }

  const addTicket = () => setForm(prev => ({
    ...prev,
    ticketTypes: [...prev.ticketTypes, { name: '', price: '0', quantity: '0', description: '' }],
  }))

  const removeTicket = (i: number) => setForm(prev => ({
    ...prev,
    ticketTypes: prev.ticketTypes.filter((_, idx) => idx !== i),
  }))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (!form.title.trim()) {
        throw new Error('Por favor, preencha o título do evento.')
      }
      if (!form.date || !form.time) {
        throw new Error('Por favor, informe a Data e o Horário do evento.')
      }

      const dateTime = `${form.date}T${form.time}:00`

      const data: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        date: dateTime,
        location: form.location,
        genre: form.genre || null,
        status: form.status,
        event_type: form.event_type,
        visibility: form.visibility,
        price: parseFloat(form.price) || 0,
        capacity: parseInt(form.capacity, 10) || 0,
        ticket_types: form.event_type === 'FREE'
          ? []
          : form.ticketTypes
              .filter(t => t.name.trim().length > 0)
              .map(t => ({
                name: t.name.trim(),
                price: parseFloat(t.price) || 0,
                quantity: parseInt(t.quantity, 10) || 0,
                description: t.description?.trim() || null,
              })),
      }

      // Gerenciar senha de acesso
      if (!enablePassword) {
        // Admin desativou a senha — limpar
        data.access_password = null
      } else if (accessPassword.trim()) {
        // Admin digitou uma nova senha — atualizar
        data.access_password = accessPassword.trim()
      }
      // Se enablePassword === true E accessPassword vazio: mantém a senha atual (undefined = não enviado)

      const res = await fetch(`${API_URL}/admin/events/${event.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ data, adminMessage: adminMessage.trim() || undefined }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Erro ao salvar.' }))
        throw new Error((err as any).message ?? 'Erro ao salvar evento.')
      }

      onSaved?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar evento.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.55rem 0.75rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    background: '#fff',
    color: '#0f172a',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.3rem',
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#475569',
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        zIndex: 1000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '2rem 1rem',
        overflowY: 'auto',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '720px',
        boxShadow: '0 25px 60px -10px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          color: '#fff',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Admin · Editar Evento
            </p>
            <h2 style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              {event.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.1rem' }}
          >
            ×
          </button>
        </div>

        {/* Loading */}
        {step === 'loading' && (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>⏳</div>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Carregando dados do evento...</p>
          </div>
        )}

        {/* Body — Edit */}
        {step === 'edit' && (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '70vh' }}>
            {error && (
              <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div>
              <label style={labelStyle}>Título *</label>
              <input name="title" value={form.title} onChange={handleChange} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Descrição</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Data *</label>
                <input type="date" name="date" value={form.date} onChange={handleChange} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Horário *</label>
                <input type="time" name="time" value={form.time} onChange={handleChange} style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Local / Endereço</label>
              <input name="location" value={form.location} onChange={handleChange} style={inputStyle} />
            </div>


            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={labelStyle}>Gênero</label>
                <input name="genre" value={form.genre} onChange={handleChange} style={inputStyle} placeholder="Ex: Música" />
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select name="status" value={form.status} onChange={handleChange} style={inputStyle}>
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="finished">Encerrado</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Visibilidade</label>
                <select name="visibility" value={form.visibility} onChange={handleChange} style={inputStyle}>
                  <option value="PUBLIC">Público</option>
                  <option value="PRIVATE">Privado</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Tipo de Evento</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {(['PAID', 'FREE'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, event_type: t }))}
                    style={{
                      padding: '0.6rem 1rem',
                      borderRadius: '8px',
                      border: form.event_type === t ? '2px solid #6366f1' : '1px solid #cbd5e1',
                      background: form.event_type === t ? '#eef2ff' : '#fff',
                      color: form.event_type === t ? '#4338ca' : '#64748b',
                      fontWeight: form.event_type === t ? 700 : 500,
                      cursor: 'pointer',
                      fontSize: '0.88rem',
                    }}
                  >
                    {t === 'PAID' ? '💳 Pago' : '🎟️ Gratuito'}
                  </button>
                ))}
              </div>
            </div>

            {form.event_type === 'PAID' && (
              <section style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>Tipos de Ingresso</h3>
                  <button
                    type="button"
                    onClick={addTicket}
                    style={{ background: '#1e293b', color: '#fff', padding: '0.4rem 0.9rem', borderRadius: '7px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                  >
                    + Adicionar
                  </button>
                </div>

                {form.ticketTypes.length === 0 && (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '0.5rem 0' }}>
                    Nenhum tipo de ingresso. Clique em &quot;Adicionar&quot; para criar.
                  </p>
                )}

                {form.ticketTypes.map((tt, i) => (
                  <div key={i} style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '0.75rem', marginBottom: '0.6rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Ingresso #{i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeTicket(i)}
                        style={{ border: '1px solid #fecaca', borderRadius: '6px', background: '#fef2f2', color: '#dc2626', padding: '2px 8px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Remover
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                      <div>
                        <label style={labelStyle}>Nome *</label>
                        <input value={tt.name} onChange={(e) => handleTicketChange(i, 'name', e.target.value)} placeholder="Ex: Inteira" style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Preço (R$) *</label>
                        <input type="number" min="0" step="0.01" value={tt.price} onChange={(e) => handleTicketChange(i, 'price', e.target.value)} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Quantidade *</label>
                        <input type="number" min="0" value={tt.quantity} onChange={(e) => handleTicketChange(i, 'quantity', e.target.value)} style={inputStyle} />
                      </div>
                    </div>
                  </div>
                ))}

                {form.ticketTypes.length > 0 && (
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Capacidade total: <strong style={{ color: '#0f172a' }}>{form.capacity}</strong>
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Preço médio: <strong style={{ color: '#0f172a' }}>R$ {Number(form.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </span>
                  </div>
                )}
              </section>
            )}
          {/* Seção de Senha de Acesso */}
          <section style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: enablePassword ? '0.85rem' : 0 }}>
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>🔐 Senha de Acesso</span>
                {hasPassword && (
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '999px', padding: '1px 8px', fontWeight: 600 }}>
                    Senha ativa
                  </span>
                )}
                {!hasPassword && (
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '999px', padding: '1px 8px', fontWeight: 600 }}>
                    Sem senha
                  </span>
                )}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                <div
                  onClick={() => { setEnablePassword(p => !p); if (enablePassword) setAccessPassword('') }}
                  style={{
                    width: 36, height: 20, borderRadius: 10,
                    background: enablePassword ? '#6366f1' : '#cbd5e1',
                    position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2, left: enablePassword ? 18 : 2,
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </div>
                {enablePassword ? 'Habilitada' : 'Desabilitada'}
              </label>
            </div>

            {enablePassword && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                  Senha de acesso
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={accessPassword}
                    onChange={e => setAccessPassword(e.target.value)}
                    placeholder={hasPassword ? '••••••••  (senha atual ativa)' : 'Digite a senha de acesso...'}
                    style={{
                      width: '100%', padding: '0.55rem 2.5rem 0.55rem 0.75rem',
                      border: '1px solid #cbd5e1', borderRadius: '8px',
                      fontSize: '0.9rem', boxSizing: 'border-box', background: '#fff', color: '#0f172a',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#94a3b8', padding: '0.2rem', display: 'flex', alignItems: 'center',
                    }}
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    )}
                  </button>
                </div>
                {hasPassword && (
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                    A senha é armazenada de forma criptografada e não pode ser exibida. Deixe em branco para manter a atual, ou digite uma nova para substituir.
                  </p>
                )}
              </div>
            )}
          </section>
          </div>
        )}

        {/* Body — Confirm */}
        {step === 'confirm' && (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '1rem' }}>
              <p style={{ margin: 0, fontWeight: 700, color: '#92400e', fontSize: '0.9rem' }}>
                ⚠️ Confirmar alterações no evento
              </p>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.84rem', color: '#78350f' }}>
                Você está prestes a salvar modificações no evento <strong>&quot;{event.title}&quot;</strong> como administrador. Essa ação não pode ser desfeita.
              </p>
            </div>

            <div>
              <label style={{ ...labelStyle, fontSize: '0.88rem', color: '#334155' }}>
                Mensagem ao organizador (opcional)
              </label>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                O organizador receberá uma notificação. Descreva o que foi alterado para mantê-lo informado.
              </p>
              <textarea
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                rows={4}
                placeholder="Ex: Corrigimos a data e horário do evento de acordo com a informação enviada."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {error && (
              <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {step !== 'loading' && (
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            background: '#fafbfc',
          }}>
            {step === 'edit' ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => { setError(null); setStep('confirm') }}
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}
                >
                  Revisar e Salvar →
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep('edit')}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  ← Voltar para Edição
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSave()}
                  style={{
                    padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none',
                    background: saving ? '#94a3b8' : 'linear-gradient(135deg, #059669, #047857)',
                    color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: saving ? 'none' : '0 2px 8px rgba(5,150,105,0.35)',
                  }}
                >
                  {saving ? 'Salvando...' : '✓ Confirmar e Salvar'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import {
  fetchConversations,
  fetchEventMessages,
  contactEventOrganizer,
  type AdminConversationItem,
  type EventMessageItem,
} from '../admin.service'
import type { AdminDashboardData } from '@mypass360/types'

interface AdminMessagesSectionProps {
  dashboard?: AdminDashboardData | null
  refreshKey?: number
  onRefresh?: () => void
}

type DateFilter = 'todos' | 'hoje' | 'esta_semana' | 'este_mes'

function matchesDateFilter(dateIso: string, filter: DateFilter): boolean {
  if (filter === 'todos') return true
  if (!dateIso) return false

  const msgDate = new Date(dateIso)
  const now = new Date()

  if (filter === 'hoje') {
    return (
      msgDate.getDate() === now.getDate() &&
      msgDate.getMonth() === now.getMonth() &&
      msgDate.getFullYear() === now.getFullYear()
    )
  }

  if (filter === 'esta_semana') {
    const diffTime = Math.abs(now.getTime() - msgDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 7
  }

  if (filter === 'este_mes') {
    return (
      msgDate.getMonth() === now.getMonth() &&
      msgDate.getFullYear() === now.getFullYear()
    )
  }

  return true
}

/**
 * Dropdown customizado com pesquisa interna em tempo real para filtrar eventos na barra principal.
 */
function SearchableEventFilterDropdown({
  conversations,
  selectedTitle,
  onSelectTitle,
}: {
  conversations: AdminConversationItem[]
  selectedTitle: string
  onSelectTitle: (title: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filteredList = conversations.filter((c) =>
    c.eventTitle.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div style={{ position: 'relative', width: '270px' }}>
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          padding: '0.5rem 0.85rem',
          borderRadius: '10px',
          border: '1px solid #cbd5e1',
          background: '#fff',
          fontSize: '0.83rem',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <span
          style={{
            color: selectedTitle ? '#0f172a' : '#64748b',
            fontWeight: selectedTitle ? 600 : 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {selectedTitle ? `🔍 Evento: ${selectedTitle}` : '🔍 Buscar evento por nome...'}
        </span>
        <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '0.4rem' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '105%',
            right: 0,
            width: '290px',
            background: '#fff',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.18)',
            zIndex: 9999,
            padding: '0.5rem',
            maxHeight: '260px',
            overflowY: 'auto',
          }}
        >
          <input
            type="text"
            placeholder="🔍 Digite para pesquisar evento..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1.5px solid #6366f1',
              fontSize: '0.82rem',
              marginBottom: '0.4rem',
              outline: 'none',
            }}
            autoFocus
          />

          <div
            onClick={() => {
              onSelectTitle('')
              setIsOpen(false)
            }}
            style={{
              padding: '0.45rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              background: !selectedTitle ? '#eef2ff' : 'transparent',
              color: !selectedTitle ? '#4f46e5' : '#475569',
              fontWeight: !selectedTitle ? 700 : 500,
              marginBottom: '0.25rem',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            ⚡ Todos os Eventos (Ver tudo)
          </div>

          {filteredList.length === 0 ? (
            <div style={{ padding: '0.6rem', fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>
              Nenhum evento encontrado
            </div>
          ) : (
            filteredList.map((c) => (
              <div
                key={c.eventId}
                onClick={() => {
                  onSelectTitle(c.eventTitle)
                  setIsOpen(false)
                }}
                style={{
                  padding: '0.5rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  background: selectedTitle === c.eventTitle ? '#eef2ff' : 'transparent',
                  color: selectedTitle === c.eventTitle ? '#4f46e5' : '#1e293b',
                  fontWeight: selectedTitle === c.eventTitle ? 700 : 400,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.eventTitle}
                </span>
                {c.lastSender === 'organizer' && (
                  <span
                    style={{
                      fontSize: '0.65rem',
                      background: '#fee2e2',
                      color: '#dc2626',
                      padding: '0.1rem 0.35rem',
                      borderRadius: '4px',
                      flexShrink: 0,
                    }}
                  >
                    Nova msg
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Dropdown customizado pesquisável para seleção de eventos no modal de nova conversa.
 */
function SearchableEventDropdown({
  events,
  selectedEventId,
  onSelectEvent,
}: {
  events: Array<{ id: string; title: string; status: string }>
  selectedEventId: string
  onSelectEvent: (eventId: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selectedEvent = events.find((e) => e.id === selectedEventId)
  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: '100%',
          padding: '0.65rem 0.85rem',
          borderRadius: '10px',
          border: '1px solid #cbd5e1',
          background: '#fff',
          fontSize: '0.88rem',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <span style={{ color: selectedEvent ? '#0f172a' : '#94a3b8', fontWeight: selectedEvent ? 600 : 400 }}>
          {selectedEvent ? `${selectedEvent.title} (${selectedEvent.status})` : '-- Clique ou digite para pesquisar um evento --'}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{isOpen ? '▲' : '▼'}</span>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '105%', left: 0, right: 0,
          background: '#fff', border: '1px solid #cbd5e1', borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.18)', zIndex: 9999,
          padding: '0.5rem', maxHeight: '240px', overflowY: 'auto',
        }}>
          <input
            type="text"
            placeholder="🔍 Digite para pesquisar evento no dropdown..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px',
              border: '1.5px solid #6366f1', fontSize: '0.83rem', marginBottom: '0.4rem',
              outline: 'none',
            }}
            autoFocus
          />

          {filteredEvents.length === 0 ? (
            <div style={{ padding: '0.6rem', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
              Nenhum evento encontrado
            </div>
          ) : (
            filteredEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => {
                  onSelectEvent(ev.id)
                  setIsOpen(false)
                }}
                style={{
                  padding: '0.55rem 0.75rem', borderRadius: '8px',
                  fontSize: '0.85rem', cursor: 'pointer',
                  background: selectedEventId === ev.id ? '#eef2ff' : 'transparent',
                  color: selectedEventId === ev.id ? '#4f46e5' : '#1e293b',
                  fontWeight: selectedEventId === ev.id ? 700 : 400,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <span>{ev.title}</span>
                <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#f1f5f9', padding: '0.15rem 0.45rem', borderRadius: '6px' }}>
                  {ev.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function AdminMessagesSection({ dashboard, refreshKey, onRefresh }: AdminMessagesSectionProps) {
  const [conversations, setConversations] = useState<AdminConversationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('todos')

  // Conversa selecionada para visualização/resposta no modal
  const [activeModalEvent, setActiveModalEvent] = useState<{
    eventId: string
    eventTitle: string
  } | null>(null)

  // Mensagens do modal ativo
  const [messages, setMessages] = useState<EventMessageItem[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [replyInput, setReplyInput] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [replyError, setReplyError] = useState<string | null>(null)
  const [replySuccess, setReplySuccess] = useState(false)

  // Modal para iniciar conversa em qualquer evento
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [selectedNewEventId, setSelectedNewEventId] = useState('')
  const [newEventMessage, setNewEventMessage] = useState('')

  async function loadConversations() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchConversations()
      setConversations(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar conversas.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadConversations()
    if (activeModalEvent) {
      void fetchEventMessages(activeModalEvent.eventId).then(setMessages)
    }
  }, [refreshKey])

  async function openChatModal(eventId: string, eventTitle: string) {
    setActiveModalEvent({ eventId, eventTitle })
    setLoadingMessages(true)
    setReplyError(null)
    setReplySuccess(false)
    setReplyInput('')

    try {
      const history = await fetchEventMessages(eventId)
      setMessages(history)
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : 'Erro ao carregar mensagens.')
    } finally {
      setLoadingMessages(false)
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!activeModalEvent || !replyInput.trim()) return

    setSendingReply(true)
    setReplyError(null)
    try {
      await contactEventOrganizer(activeModalEvent.eventId, replyInput.trim())
      setReplyInput('')
      setReplySuccess(true)
      setTimeout(() => setReplySuccess(false), 2500)

      // Recarregar mensagens e lista
      const updatedHistory = await fetchEventMessages(activeModalEvent.eventId)
      setMessages(updatedHistory)
      void loadConversations()
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : 'Erro ao enviar mensagem.')
    } finally {
      setSendingReply(false)
    }
  }

  async function handleStartNewChat(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedNewEventId || !newEventMessage.trim()) return

    setSendingReply(true)
    try {
      await contactEventOrganizer(selectedNewEventId, newEventMessage.trim())
      setShowNewChatModal(false)
      setSelectedNewEventId('')
      setNewEventMessage('')
      void loadConversations()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao iniciar conversa.')
    } finally {
      setSendingReply(false)
    }
  }

  const filteredConversations = conversations.filter((c) => {
    const matchesSearch = c.eventTitle.toLowerCase().includes(search.toLowerCase())
    const matchesTime = matchesDateFilter(c.lastMessageAt, dateFilter)
    return matchesSearch && matchesTime
  })

  const allEvents = dashboard?.events ?? []

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <style>{`
        .msg-overlay {
          position: fixed; inset: 0;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          z-index: 9998;
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
          animation: fadeIn 0.15s ease;
        }
        .msg-modal {
          background: #fff;
          border-radius: 20px;
          width: 100%;
          max-width: 620px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 60px -12px rgba(0,0,0,0.35);
          animation: slideUp 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      {/* Header com busca, filtro de datas e botão de Nova Conversa */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px',
        padding: '1.25rem 1.5rem', boxShadow: '0 4px 12px rgba(15,23,42,0.03)',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              💬 Central de Mensagens e Diálogo
            </h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.84rem', color: '#64748b' }}>
              Acompanhe e responda em tempo real todas as mensagens trocadas com os organizadores.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowNewChatModal(true)}
            style={{
              background: '#4f46e5', color: '#fff', border: 'none',
              borderRadius: '10px', padding: '0.6rem 1.1rem',
              fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              boxShadow: '0 4px 12px rgba(79,70,229,0.25)',
            }}
          >
            <span>+</span>
            <span>Iniciar nova conversa</span>
          </button>
        </div>

        {/* Barra de Filtros: Dropdown Pesquisável por Evento e Filtro por Data */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
          paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9',
        }}>
          {/* Seletor de Período (Hoje, Esta semana, Este mês, Todos) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginRight: '0.25rem' }}>Filtro de Data:</span>
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'hoje', label: 'Hoje' },
              { id: 'esta_semana', label: 'Esta Semana' },
              { id: 'este_mes', label: 'Este Mês' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDateFilter(item.id as DateFilter)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: dateFilter === item.id ? '#4f46e5' : '#f1f5f9',
                  color: dateFilter === item.id ? '#ffffff' : '#475569',
                  transition: 'all 0.15s ease',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Dropdown com pesquisa interna para filtrar conversas por evento */}
          <SearchableEventFilterDropdown
            conversations={conversations}
            selectedTitle={search}
            onSelectTitle={(title) => setSearch(title)}
          />
        </div>
      </div>

      {/* Lista de Conversas Ativas */}
      {isLoading ? (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          Carregando conversas...
        </div>
      ) : error ? (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '16px', padding: '1.25rem', color: '#991b1b' }}>
          {error}
        </div>
      ) : filteredConversations.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '3rem 1.5rem', textAlign: 'center' }}>
          <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>💬</span>
          <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.05rem', color: '#1e293b' }}>Nenhuma conversa encontrada</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
            {search || dateFilter !== 'todos' ? 'Tente ajustar os filtros de busca ou data.' : 'Clique em "Iniciar nova conversa" para entrar em contato com um organizador.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
          {filteredConversations.map((c) => {
            const isOrganizerSender = c.lastSender === 'organizer'
            return (
              <div
                key={c.eventId}
                style={{
                  background: '#fff',
                  border: isOrganizerSender ? '2px solid #6366f1' : '1px solid #e2e8f0',
                  borderRadius: '16px', padding: '1.25rem',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  gap: '1rem', boxShadow: isOrganizerSender ? '0 4px 20px rgba(99,102,241,0.12)' : '0 2px 8px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                      {c.eventTitle}
                    </h3>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '20px',
                      background: isOrganizerSender ? '#eef2ff' : '#f1f5f9',
                      color: isOrganizerSender ? '#4f46e5' : '#475569',
                      border: isOrganizerSender ? '1px solid #c7d2fe' : '1px solid #cbd5e1',
                      flexShrink: 0,
                    }}>
                      {isOrganizerSender ? '👤 Resposta do Dono' : '🛡️ Enviado por Admin'}
                    </span>
                  </div>

                  <div style={{
                    background: isOrganizerSender ? '#f8fafc' : '#f8fafc',
                    border: '1px solid #f1f5f9', borderRadius: '10px',
                    padding: '0.65rem 0.75rem', fontSize: '0.83rem', color: '#334155',
                    lineHeight: 1.4, margin: '0.5rem 0',
                  }}>
                    "{c.lastMessage}"
                  </div>

                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>
                    Última interação: {new Date(c.lastMessageAt).toLocaleString('pt-BR')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => void openChatModal(c.eventId, c.eventTitle)}
                  style={{
                    width: '100%', background: '#0f172a', color: '#fff',
                    border: 'none', borderRadius: '10px', padding: '0.6rem',
                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  }}
                >
                  <span>💬</span>
                  <span>Abrir conversa / Responder</span>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Chat Ativo */}
      {activeModalEvent && (
        <div className="msg-overlay" onClick={(e) => e.target === e.currentTarget && !sendingReply && setActiveModalEvent(null)}>
          <div className="msg-modal">
            {/* Header Fixo */}
            <div style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
              padding: '1.25rem 1.5rem', color: '#fff',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              position: 'sticky', top: 0, zIndex: 10, flexShrink: 0,
            }}>
              <div>
                <p style={{ margin: '0 0 0.2rem', fontSize: '0.72rem', color: '#c7d2fe', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  DIÁLOGO COM O ORGANIZADOR
                </p>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  {activeModalEvent.eventTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalEvent(null)}
                disabled={sendingReply}
                style={{
                  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px', padding: '0.35rem 0.6rem',
                  color: '#fff', cursor: 'pointer', fontSize: '0.8rem',
                }}
              >
                ✕
              </button>
            </div>

            {/* Body Rolável */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
              {loadingMessages ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  Carregando histórico...
                </div>
              ) : (
                <div style={{ marginBottom: '1.25rem' }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    💬 LINHA DO TEMPO DA CONVERSA ({messages.length})
                  </p>
                  {messages.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b', fontSize: '0.85rem' }}>
                      Nenhuma mensagem enviada ainda. Digite abaixo para iniciar o diálogo.
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: '0.6rem',
                      maxHeight: '220px', overflowY: 'auto',
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: '12px', padding: '0.85rem',
                    }}>
                      {messages.map((m) => {
                        const isAdmin = m.sender === 'admin'
                        return (
                          <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isAdmin ? 'flex-end' : 'flex-start' }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: isAdmin ? '#4f46e5' : '#059669', marginBottom: '0.1rem' }}>
                              {isAdmin ? '🛡️ Você (Administração)' : '👤 Organizador'}
                            </div>
                            <div style={{
                              background: isAdmin ? '#eef2ff' : '#ffffff',
                              border: isAdmin ? '1px solid #c7d2fe' : '1px solid #cbd5e1',
                              borderRadius: '10px', padding: '0.55rem 0.75rem', maxWidth: '85%',
                              fontSize: '0.84rem', color: '#1e293b', lineHeight: 1.4,
                            }}>
                              {m.message}
                            </div>
                            <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                              {new Date(m.createdAt).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {replySuccess && (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem', color: '#15803d', fontWeight: 700, fontSize: '0.85rem', textAlign: 'center' }}>
                  ✅ Mensagem enviada ao organizador com sucesso!
                </div>
              )}

              {replyError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem', color: '#991b1b', fontSize: '0.85rem' }}>
                  {replyError}
                </div>
              )}

              <form onSubmit={handleSendReply}>
                <div style={{ marginBottom: '1rem' }}>
                  <label htmlFor="admin-reply-input" style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    Enviar mensagem ao organizador <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <textarea
                    id="admin-reply-input"
                    rows={3}
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    placeholder="Digite sua resposta ou instrução aqui..."
                    required
                    style={{
                      width: '100%', borderRadius: '10px', border: '1px solid #cbd5e1',
                      padding: '0.65rem', fontSize: '0.88rem', resize: 'vertical', outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setActiveModalEvent(null)}
                    disabled={sendingReply}
                    style={{
                      background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px',
                      padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer',
                    }}
                  >
                    Fechar
                  </button>
                  <button
                    type="submit"
                    disabled={sendingReply || !replyInput.trim()}
                    style={{
                      background: sendingReply ? '#94a3b8' : '#4f46e5', color: '#fff', border: 'none',
                      borderRadius: '10px', padding: '0.55rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, cursor: sendingReply ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {sendingReply ? 'Enviando...' : 'Enviar mensagem 💬'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Iniciar Nova Conversa sobre Qualquer Evento */}
      {showNewChatModal && (
        <div className="msg-overlay" onClick={(e) => e.target === e.currentTarget && !sendingReply && setShowNewChatModal(false)}>
          <div className="msg-modal" style={{ maxWidth: '540px' }}>
            <div style={{ background: '#0f172a', padding: '1.25rem 1.5rem', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                Iniciar conversa com Organizador
              </h3>
              <button type="button" onClick={() => setShowNewChatModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
            </div>

            <form onSubmit={handleStartNewChat} style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Selecione o evento (Pesquisa rápida) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                {/* Dropdown customizado com busca em tempo real */}
                <SearchableEventDropdown
                  events={allEvents}
                  selectedEventId={selectedNewEventId}
                  onSelectEvent={(id) => setSelectedNewEventId(id)}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                  Mensagem inicial <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  value={newEventMessage}
                  onChange={(e) => setNewEventMessage(e.target.value)}
                  placeholder="Escreva sua mensagem para o organizador deste evento..."
                  required
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.55rem 1rem', fontSize: '0.85rem', color: '#475569', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sendingReply || !selectedNewEventId || !newEventMessage.trim()}
                  style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.55rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {sendingReply ? 'Enviando...' : 'Iniciar Conversa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

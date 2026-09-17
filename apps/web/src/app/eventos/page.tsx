'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSupabaseEvents } from '@/features/events/hooks/useSupabaseEvents'
import { EventCard } from '@/features/events/components/EventCard'
import { EventsHeroCarousel } from '@/features/events/components/EventsHeroCarousel'

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const CATEGORIES = ['Todos', 'Música', 'Festival', 'Esportes', 'Teatro', 'Gastronomia', 'Cultura', 'Tech']

function extractCityFromLocation(location: string): string | null {
  if (!location) return null
  const statePattern = /([A-Za-zÀ-ÿ\s]+)\s*[,\-–—]\s*([A-Z]{2})\s*$/
  const stateMatch = location.match(statePattern)
  if (stateMatch) return stateMatch[1].trim()

  const parts = location.split(/[,\-–—]/).map((p) => p.trim()).filter(Boolean)
  const cityLike = parts.reverse().find((p) => p.length > 3 && !/^\d/.test(p))
  return cityLike ?? null
}

export default function EventsPage() {
  const { events, isLoading } = useSupabaseEvents()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todos')
  const [selectedCity, setSelectedCity] = useState('Todas as cidades')
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | 'paid' | 'free'>('all')

  const now = Date.now()
  const publishedEvents = events.filter((e) => e.status === 'published' && e.visibility !== 'PRIVATE')

  function resolveEventCity(ev: (typeof publishedEvents)[0]): string | null {
    if (ev.city) return ev.state ? `${ev.city} - ${ev.state}` : ev.city
    const extracted = extractCityFromLocation(ev.location)
    return extracted || null
  }

  const availableCities = Array.from(
    new Set(
      publishedEvents
        .map((e) => resolveEventCity(e))
        .filter((c): c is string => Boolean(c))
    )
  ).sort()

  const cityCount: Record<string, number> = {}
  for (const ev of publishedEvents) {
    const city = resolveEventCity(ev)
    if (city) cityCount[city] = (cityCount[city] ?? 0) + 1
  }

  const hotEvents = [...publishedEvents]
    .filter((e) => new Date(e.date).getTime() >= now)
    .sort((a, b) => (Number((b as unknown as { sold?: number }).sold ?? 0) - Number((a as unknown as { sold?: number }).sold ?? 0)))
    .slice(0, Math.min(4, publishedEvents.length))

  const hotIds = new Set(hotEvents.map((e) => e.id))

  const filteredEvents = publishedEvents.filter((ev) => {
    const matchesSearch =
      !search ||
      ev.title.toLowerCase().includes(search.toLowerCase()) ||
      ev.location.toLowerCase().includes(search.toLowerCase()) ||
      (ev.city && ev.city.toLowerCase().includes(search.toLowerCase()))

    const matchesCategory = activeCategory === 'Todos' || ev.genre === activeCategory

    const resolvedCity = resolveEventCity(ev)
    const matchesCity =
      selectedCity === 'Todas as cidades' ||
      (resolvedCity !== null && resolvedCity === selectedCity) ||
      ev.location.toLowerCase().includes(selectedCity.split(' - ')[0].toLowerCase())

    const isFree = ev.event_type === 'FREE' || ev.price === 0
    const matchesEventType =
      eventTypeFilter === 'all' ||
      (eventTypeFilter === 'free' && isFree) ||
      (eventTypeFilter === 'paid' && !isFree)

    return matchesSearch && matchesCategory && matchesCity && matchesEventType
  })

  const heroEvents = publishedEvents.filter((e) => new Date(e.date).getTime() >= now).slice(0, 8)

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8fb', fontFamily: 'inherit' }}>

      {/* ── HERO CAROUSEL ── */}
      {!isLoading && heroEvents.length > 0 && (
        <EventsHeroCarousel events={heroEvents} />
      )}

      {/* Loading hero skeleton */}
      {isLoading && (
        <div style={{
          height: '280px',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid #cbd5e1',
            borderTopColor: '#4f46e5',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── SEARCH + FILTER BAR ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'rgba(248,248,251,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e8e8f0',
        padding: '0.9rem 1.5rem',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Search bar + City Selector + Event Type Filter */}
          <div style={{ display: 'flex', gap: '0.75rem', maxWidth: '850px', width: '100%', margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 280px' }}>
              <span style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                display: 'flex',
                pointerEvents: 'none',
              }}>
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Buscar experiências, locais..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.7rem 1rem 0.7rem 2.75rem',
                  borderRadius: '50px',
                  border: '1.5px solid #e2e8f0',
                  background: '#fff',
                  fontSize: '0.92rem',
                  color: '#0f172a',
                  outline: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6366f1'
                  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0'
                  e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
                }}
              />
            </div>

            {/* City Filter Selector */}
            <div style={{ position: 'relative', flex: '0 0 auto', minWidth: '180px' }}>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.7rem 2.2rem 0.7rem 2.2rem',
                  borderRadius: '50px',
                  border: selectedCity !== 'Todas as cidades' ? '1.5px solid #2563eb' : '1.5px solid #e2e8f0',
                  background: selectedCity !== 'Todas as cidades' ? '#eff6ff' : '#fff',
                  color: selectedCity !== 'Todas as cidades' ? '#1d4ed8' : '#334155',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  boxSizing: 'border-box',
                }}
              >
                <option value="Todas as cidades">📍 Todas as Cidades</option>
                {availableCities.map((city) => (
                  <option key={city} value={city}>
                    🏙️ {city}{cityCount[city] ? ` (${cityCount[city]})` : ''}
                  </option>
                ))}
              </select>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.9rem' }}>
                📍
              </span>
              <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.75rem', color: '#64748b' }}>
                ▼
              </span>
            </div>

            {/* Aba Todos / Gratuitos / Pagos */}
            <div style={{ display: 'flex', gap: '0.25rem', background: '#e2e8f0', padding: '3px', borderRadius: '50px' }}>
              {(['all', 'paid', 'free'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEventTypeFilter(type)}
                  style={{
                    padding: '0.45rem 0.95rem',
                    borderRadius: '50px',
                    border: 'none',
                    background: eventTypeFilter === type ? '#0f172a' : 'transparent',
                    color: eventTypeFilter === type ? '#fff' : '#475569',
                    fontWeight: eventTypeFilter === type ? 700 : 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {type === 'all' ? 'Todos' : type === 'paid' ? '💳 Pagos' : '🎟️ Gratuitos'}
                </button>
              ))}
            </div>
          </div>

          {/* Categories pills */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '0.35rem 1rem',
                  borderRadius: '20px',
                  border: activeCategory === cat ? 'none' : '1.5px solid #e2e8f0',
                  background: activeCategory === cat ? '#0f172a' : '#fff',
                  color: activeCategory === cat ? '#fff' : '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── EVENTS GRID ── */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>

        {/* ── MAIS VENDIDOS 🔥 ── */}
        {!isLoading && !search && selectedCity === 'Todas as cidades' && activeCategory === 'Todos' && eventTypeFilter === 'all' && hotEvents.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>🔥</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                  Mais Vendidos
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#f97316', fontWeight: 600 }}>
                  Os eventos mais procurados agora
                </p>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.1rem',
            }}>
              {hotEvents.map((event) => (
                <EventCard key={event.id} event={event} hot />
              ))}
            </div>

            <div style={{
              height: '1px',
              background: 'linear-gradient(90deg, transparent, #e2e8f0, transparent)',
              margin: '2.5rem 0 0',
            }} />
          </div>
        )}

        {/* Section header — Próximos Eventos */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
              {search
                ? `Resultados para "${search}"`
                : selectedCity !== 'Todas as cidades'
                ? `Eventos em ${selectedCity.split(' - ')[0]}`
                : activeCategory !== 'Todos'
                ? `Eventos de ${activeCategory}`
                : eventTypeFilter === 'paid'
                ? 'Eventos Pagos'
                : eventTypeFilter === 'free'
                ? 'Eventos Gratuitos'
                : 'Próximos Eventos'}
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              {filteredEvents.length} {filteredEvents.length === 1 ? 'evento encontrado' : 'eventos encontrados'}
            </p>
          </div>
          <Link
            href="/meus-eventos"
            style={{
              padding: '0.5rem 1.1rem',
              background: '#f1f5f9',
              color: '#334155',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.82rem',
              fontWeight: 600,
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#e2e8f0')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#f1f5f9')}
          >
            Meus Eventos →
          </Link>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}>
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                style={{
                  borderRadius: '16px',
                  aspectRatio: '16 / 9',
                  background: 'linear-gradient(90deg, #f0f0f5 25%, #e8e8ef 50%, #f0f0f5 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }}
              />
            ))}
            <style>{`
              @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredEvents.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '5rem 2rem',
            background: '#fff',
            borderRadius: '20px',
            border: '1.5px dashed #e2e8f0',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.15rem', color: '#0f172a', fontWeight: 700 }}>
              Nenhum evento encontrado
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
              {search ? 'Tente buscar por outro termo.' : 'Nenhum evento encontrado nesta categoria.'}
            </p>
          </div>
        )}

        {/* Cards grid */}
        {!isLoading && filteredEvents.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem',
          }}>
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} hot={hotIds.has(event.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

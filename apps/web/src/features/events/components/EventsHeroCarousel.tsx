'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { Event } from '@mypass360/types'

interface EventsHeroCarouselProps {
  events: Event[]
}

export function EventsHeroCarousel({ events }: EventsHeroCarouselProps) {
  const [current, setCurrent] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const touchStartX = useRef(0)

  const total = events.length
  if (total === 0) return null

  const getIndex = (offset: number) => ((current + offset) % total + total) % total

  // Verifica responsividade no client
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const go = useCallback((dir: 1 | -1) => {
    if (isAnimating) return
    setIsAnimating(true)
    setCurrent((c) => ((c + dir) % total + total) % total)
    setTimeout(() => setIsAnimating(false), 400)
  }, [isAnimating, total])

  // Suporte a gestos swipe no mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX
    if (Math.abs(diff) > 50) {
      if (diff > 0) go(1) // deslizar para esquerda -> próximo
      else go(-1) // deslizar para direita -> anterior
    }
  }

  // auto-play
  useEffect(() => {
    if (total <= 1) return
    const id = setInterval(() => go(1), 5000)
    return () => clearInterval(id)
  }, [go, total])

  // Card positions: [-2, -1, 0, 1, 2]
  const positions = [-2, -1, 0, 1, 2]

  const getCardStyle = (offset: number): React.CSSProperties => {
    const abs = Math.abs(offset)
    const sign = Math.sign(offset) || 0

    let translateX = sign * (abs === 1 ? 52 : abs === 2 ? 88 : 0)
    let translateZ = abs === 0 ? 0 : abs === 1 ? -100 : -200
    let scale = abs === 0 ? 1 : abs === 1 ? 0.85 : 0.7
    let rotateY = sign * (abs === 1 ? -15 : abs === 2 ? -25 : 0)
    let zIndex = 10 - abs * 2
    let opacity = abs <= 2 ? 1 : 0

    if (isMobile) {
      // Ajustes específicos para mobile: maior largura para o card ativo, e laterais discretas (peeking)
      translateX = sign * (abs === 1 ? 86 : abs === 2 ? 160 : 0)
      translateZ = abs === 0 ? 0 : abs === 1 ? -40 : -80
      scale = abs === 0 ? 1 : abs === 1 ? 0.82 : 0.65
      rotateY = sign * (abs === 1 ? -10 : abs === 2 ? -18 : 0)
      opacity = abs <= 1 ? 1 : 0 // Esconde os cards mais distantes nas laterais
    }

    return {
      position: 'absolute',
      width: isMobile ? '80%' : '38%',
      maxWidth: isMobile ? '400px' : '540px',
      aspectRatio: '16/9',
      borderRadius: '14px',
      overflow: 'hidden',
      transform: `translateX(${translateX}%) translateZ(${translateZ}px) scale(${scale}) rotateY(${rotateY}deg)`,
      zIndex,
      opacity,
      transition: 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: offset !== 0 ? 'pointer' : 'default',
      boxShadow: abs === 0
        ? '0 16px 36px -8px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)'
        : '0 6px 16px -4px rgba(0,0,0,0.1)',
    }
  }

  // Fallback de imagens temáticas com base no ID do evento para testar com fotos realistas
  const getEventImage = (ev: Event) => {
    if (ev.image_url) return ev.image_url
    
    const testImages = [
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=1200&auto=format&fit=crop', // Show Rock / Festival
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200&auto=format&fit=crop', // Balada / Luzes
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop', // DJ / Música Eletrônica
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1200&auto=format&fit=crop', // Festa ao ar livre
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop', // Teatro / Iluminação
    ]
    
    const charSum = ev.title.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return testImages[charSum % testImages.length]
  }

  const centerEvent = events[current]

  return (
    <div style={{ position: 'relative', width: '100%', background: '#ffffff', overflow: 'hidden', padding: '1.25rem 0' }}>
      
      {/* ── STAGE DO CARROSSEL ── */}
      <div
        style={{
          position: 'relative',
          height: isMobile ? '230px' : 'clamp(200px, 28vw, 380px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: '1200px',
          perspectiveOrigin: '50% 50%',
          zIndex: 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {positions.map((offset) => {
          const idx = getIndex(offset)
          const ev = events[idx]
          return (
            <div
              key={`${idx}-${offset}`}
              style={getCardStyle(offset)}
              onClick={() => {
                if (offset !== 0) go(offset > 0 ? 1 : -1)
              }}
            >
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <img
                  src={getEventImage(ev)}
                  alt={ev.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {/* Overlay de gradiente sutil e texto apenas no card central */}
                {offset === 0 && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 55%, transparent 80%)',
                  }}>
                    <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '20px',
                        padding: '2px 8px',
                        fontSize: '0.65rem',
                        color: '#fff',
                        fontWeight: 700,
                        marginBottom: '0.3rem',
                      }}>
                        📍 {ev.location}
                      </div>
                      <h2 style={{
                        margin: '0 0 0.2rem',
                        fontSize: isMobile ? '1.05rem' : '1.15rem',
                        fontWeight: 800,
                        color: '#fff',
                        lineHeight: 1.25,
                      }}>
                        {ev.title}
                      </h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                          {new Date(ev.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>•</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: ev.price === 0 ? '#4ade80' : '#fbbf24' }}>
                          {ev.price === 0 ? 'Gratuito' : ev.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* ── BOTÕES DE NAVEGAÇÃO (Apenas desktop/tablet) ── */}
        {total > 1 && !isMobile && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="Anterior"
              style={{
                position: 'absolute',
                left: 'calc(50% - 300px)',
                zIndex: 20,
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#0087ff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                transition: 'transform 0.2s, background 0.2s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.08)' }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Próximo"
              style={{
                position: 'absolute',
                right: 'calc(50% - 300px)',
                zIndex: 20,
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#0087ff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                transition: 'transform 0.2s, background 0.2s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.08)' }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* ── INDICADORES E BOTÃO DE DETALHES ABAIXO ── */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '1rem', gap: '1.25rem' }}>
        {/* Dots */}
        {total > 1 && (
          <div style={{ display: 'flex', gap: '6px' }}>
            {events.map((_, i) => (
              <button
                key={i}
                onClick={() => { if (!isAnimating) { setCurrent(i) } }}
                aria-label={`Ir para evento ${i + 1}`}
                style={{
                  width: i === current ? '16px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  border: 'none',
                  background: i === current ? '#0087ff' : '#cbd5e1',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  padding: 0,
                }}
              />
            ))}
          </div>
        )}

        {/* Botão Ver Detalhes */}
        <Link
          href={`/eventos/${centerEvent.slug}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.65rem 1.75rem',
            background: '#0f172a',
            color: '#ffffff',
            borderRadius: '50px',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.85rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s, background 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.background = '#1e293b' }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = '#0f172a' }}
        >
          Ver detalhes →
        </Link>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import type { Event } from '@mypass360/types'

interface ShareEventModalProps {
  event: Event | null
  isOpen: boolean
  onClose: () => void
}

export function ShareEventModal({ event, isOpen, onClose }: ShareEventModalProps) {
  const [copied, setCopied] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  useEffect(() => {
    if (event) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mypass360.com'
      setShareUrl(`${origin}/eventos/${event.slug}`)
    }
    setCopied(false)
  }, [event])

  if (!isOpen || !event) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // Fallback para seletores antigos se navigator.clipboard falhar
      const textarea = document.createElement('textarea')
      textarea.value = shareUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            fontSize: '1.1rem',
          }}
        >
          ✕
        </button>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🔗</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Compartilhar Evento
            </h2>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
            {event.visibility === 'PRIVATE'
              ? 'Este é um evento privado. Convidados com este link direto conseguirão visualizar e acessar a confirmação.'
              : 'Envie o link do evento diretamente para seus convidados ou compartilhe nas redes.'}
          </p>
        </div>

        {event.visibility === 'PRIVATE' && (
          <div
            style={{
              background: '#f5f3ff',
              border: '1px solid #c4b5fd',
              borderRadius: '10px',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#6d28d9',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            <span>🔒</span>
            <span>Evento Privado — Invisível no catálogo público do site.</span>
          </div>
        )}

        <div>
          <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
            Link direto do evento
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              readOnly
              value={shareUrl}
              style={{
                flex: 1,
                padding: '0.7rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                fontSize: '0.88rem',
                color: '#0f172a',
                fontFamily: 'monospace',
                outline: 'none',
              }}
            />
            <button
              onClick={() => void handleCopy()}
              style={{
                padding: '0.7rem 1.25rem',
                borderRadius: '10px',
                background: copied ? '#16a34a' : '#0f172a',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.88rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {copied ? '✓ Copiado!' : 'Copiar Link'}
            </button>
          </div>
        </div>

        {copied && (
          <div
            style={{
              padding: '0.6rem 0.85rem',
              background: '#dcfce7',
              color: '#15803d',
              border: '1px solid #86efac',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 600,
              textAlign: 'center',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            🎉 Link copiado para a área de transferência!
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '10px',
            background: '#f1f5f9',
            color: '#475569',
            fontWeight: 600,
            fontSize: '0.9rem',
            border: 'none',
            cursor: 'pointer',
            marginTop: '0.25rem',
          }}
        >
          Fechar
        </button>
      </div>
    </div>
  )
}

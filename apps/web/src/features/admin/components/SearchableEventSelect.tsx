'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { EventOptionItem } from '@mypass360/types'
import { fetchEventOptions } from '../admin.service'

interface SearchableEventSelectProps {
  selectedEventId: string
  onSelectEvent: (eventId: string, eventTitle?: string) => void
}

export function SearchableEventSelect({
  selectedEventId,
  onSelectEvent,
}: SearchableEventSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [options, setOptions] = useState<EventOptionItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTitle, setSelectedTitle] = useState('Todos os eventos')

  const containerRef = useRef<HTMLDivElement>(null)

  // Carregar opções de eventos
  const loadOptions = useCallback(async (queryStr: string) => {
    setIsLoading(true)
    try {
      const data = await fetchEventOptions(queryStr)
      setOptions(data)
    } catch {
      // Ignora erro
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadOptions(search)
    }, 250)
    return () => clearTimeout(timer)
  }, [search, loadOptions])

  // Atualizar o título do evento selecionado caso mude por fora
  useEffect(() => {
    if (!selectedEventId) {
      setSelectedTitle('Todos os eventos')
    } else {
      const found = options.find((o) => o.id === selectedEventId)
      if (found) {
        setSelectedTitle(found.title)
      }
    }
  }, [selectedEventId, options])

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  function handleSelect(id: string, title: string) {
    onSelectEvent(id, title)
    setSelectedTitle(title)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', minWidth: '260px', maxWidth: '400px', width: '100%' }}>
      <style>{`
        .searchable-select-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.6rem 0.9rem;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          fontSize: 0.88rem;
          color: #0f172a;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          box-sizing: border-box;
        }
        .searchable-select-btn:hover {
          border-color: #4f46e5;
          background: #fafafa;
        }
        .searchable-select-popover {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          box-shadow: 0 12px 28px -6px rgba(0, 0, 0, 0.15);
          z-index: 999;
          overflow: hidden;
          animation: popoverFadeIn 0.15s ease;
        }
        @keyframes popoverFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .searchable-option-item {
          padding: 0.6rem 0.9rem;
          font-size: 0.85rem;
          cursor: pointer;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: background 0.1s ease;
        }
        .searchable-option-item:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .searchable-option-item.active {
          background: #e0e7ff;
          color: #4338ca;
          font-weight: 700;
        }
      `}</style>

      <button
        type="button"
        className="searchable-select-btn"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span>🎟️</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedTitle}</span>
        </span>
        <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem', flexShrink: 0 }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {isOpen && (
        <div className="searchable-select-popover">
          {/* Input de busca */}
          <div style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
            <input
              type="text"
              autoFocus
              placeholder="🔍 Digite ou selecione um evento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.82rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Lista de Opções */}
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {/* Opção Padrão: Todos os eventos */}
            <div
              className={`searchable-option-item ${!selectedEventId ? 'active' : ''}`}
              onClick={() => handleSelect('', 'Todos os eventos')}
            >
              <span>🌐 Todos os eventos</span>
              {!selectedEventId && <span>✓</span>}
            </div>

            {isLoading && options.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
                Buscando eventos...
              </div>
            ) : options.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
                Nenhum evento encontrado
              </div>
            ) : (
              options.map((opt) => (
                <div
                  key={opt.id}
                  className={`searchable-option-item ${selectedEventId === opt.id ? 'active' : ''}`}
                  onClick={() => handleSelect(opt.id, opt.title)}
                >
                  <span style={{ wordBreak: 'break-word' }}>{opt.title}</span>
                  {selectedEventId === opt.id && <span>✓</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

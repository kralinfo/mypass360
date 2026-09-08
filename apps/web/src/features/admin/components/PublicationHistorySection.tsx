'use client'

import { useCallback, useEffect, useState } from 'react'
import type { PublicationHistoryItem } from '@mypass360/types'
import { fetchPublicationHistory } from '../admin.service'
import { formatDate } from '../admin.utils'
import { SearchableEventSelect } from './SearchableEventSelect'

export function PublicationHistorySection() {
  const [selectedEventId, setSelectedEventId] = useState('')
  const [items, setItems] = useState<PublicationHistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedReasonModal, setSelectedReasonModal] = useState<{ title: string; reason: string } | null>(null)

  const loadHistory = useCallback(async (eventId?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetchPublicationHistory({
        eventId: eventId || undefined,
        limit: eventId ? 100 : 10,
      })
      setItems(res.items)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar histórico de publicações.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory(selectedEventId)
  }, [selectedEventId, loadHistory])

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      {/* ── BARRA SUPERIOR E FILTRO ── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
            Histórico de Publicações
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            {selectedEventId
              ? `Exibindo histórico específico (${items.length} registro${items.length !== 1 ? 's' : ''})`
              : 'Exibindo os 10 últimos registros processados'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
            Filtrar por evento:
          </label>
          <SearchableEventSelect
            selectedEventId={selectedEventId}
            onSelectEvent={(id) => setSelectedEventId(id)}
          />
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '12px',
            padding: '1rem',
            color: '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* ── TABELA DE HISTÓRICO DE PUBLICAÇÕES ── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
            Carregando histórico de publicações...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📜</div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#334155' }}>
              {selectedEventId ? 'Não existem registros para este evento.' : 'Não existem registros no histórico.'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              As análises e decisões de publicação dos administradores aparecerão aqui.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Evento</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Organizador</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Solicitado em</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Decisão em</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Status Final</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Admin Responsável</th>
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'right' }}>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isApproved = item.approvalStatus === 'approved'
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.9rem' }}>
                          {item.title}
                        </strong>
                        <span style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                          /{item.slug}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                        <strong>{item.organizerName ?? 'Sem nome'}</strong>
                        {item.organizerEmail && (
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                            {item.organizerEmail}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatDate(item.approvalRequestedAt ?? null)}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {formatDate(item.approvalReviewedAt ?? null)}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            background: isApproved ? '#dcfce7' : '#fee2e2',
                            color: isApproved ? '#15803d' : '#b91c1c',
                          }}
                        >
                          {isApproved ? '✓ Aprovado' : '✕ Rejeitado'}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                        {item.reviewerName ? (
                          <>
                            <strong>{item.reviewerName}</strong>
                            {item.reviewerEmail && (
                              <span style={{ display: 'block', fontSize: '0.74rem', color: '#64748b' }}>
                                {item.reviewerEmail}
                              </span>
                            )}
                          </>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Administração</span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {item.approvalRejectionReason ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedReasonModal({
                                title: item.title,
                                reason: item.approvalRejectionReason ?? '',
                              })
                            }
                            style={{
                              padding: '0.35rem 0.65rem',
                              borderRadius: '8px',
                              border: '1px solid #fca5a5',
                              background: '#fef2f2',
                              color: '#991b1b',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Ver Motivo 💬
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 600 }}>
                            Publicação Aprovada
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Motivo da Rejeição */}
      {selectedReasonModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '1rem',
          }}
          onClick={() => setSelectedReasonModal(null)}
        >
          <div
            style={{
              background: '#ffffff', borderRadius: '16px', maxWidth: '480px', width: '100%',
              padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: '#991b1b', fontWeight: 800 }}>
              Justificativa da Reprovação
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b' }}>
              Evento: <strong>{selectedReasonModal.title}</strong>
            </p>

            <div
              style={{
                background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px',
                padding: '0.85rem', fontSize: '0.88rem', color: '#7f1d1d', lineHeight: 1.45,
                marginBottom: '1.25rem',
              }}
            >
              &quot;{selectedReasonModal.reason}&quot;
            </div>

            <div style={{ textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setSelectedReasonModal(null)}
                style={{
                  padding: '0.55rem 1.25rem', borderRadius: '8px', border: 'none',
                  background: '#0f172a', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

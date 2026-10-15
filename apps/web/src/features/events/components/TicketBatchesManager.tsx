'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  type TicketBatch,
  type CreateBatchInput,
  type UpdateBatchInput,
  BATCH_STATUS_LABELS,
  BATCH_STATUS_COLORS,
  getBatchAvailable,
  fetchBatches,
  createBatch,
  updateBatch,
  closeBatch,
  deleteBatch,
} from '../services/ticket-batches.service'

interface TicketBatchesManagerProps {
  eventId: string
  ticketTypeId: string
  ticketTypeName: string
  onBatchesChange?: () => void
}

interface EditingBatch {
  id: string
  name: string
  price: string
  quantity: string
  is_unlimited: boolean
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function TicketBatchesManager({
  eventId,
  ticketTypeId,
  ticketTypeName,
  onBatchesChange,
}: TicketBatchesManagerProps) {
  const [batches, setBatches] = useState<TicketBatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingBatch, setEditingBatch] = useState<EditingBatch | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [newBatch, setNewBatch] = useState<{
    name: string
    price: string
    quantity: string
    is_unlimited: boolean
  }>({ name: '', price: '', quantity: '', is_unlimited: false })

  const loadBatches = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await fetchBatches(eventId, ticketTypeId)
      setBatches(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar lotes')
    } finally {
      setIsLoading(false)
    }
  }, [eventId, ticketTypeId])

  useEffect(() => {
    void loadBatches()
  }, [loadBatches])

  function showSuccess(msg: string) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const batchNum = batches.length + 1
      const input: CreateBatchInput = {
        name: newBatch.name.trim() || `${batchNum}º Lote`,
        price: parseFloat(newBatch.price.replace(',', '.')),
        quantity: newBatch.is_unlimited ? 0 : parseInt(newBatch.quantity, 10),
        is_unlimited: newBatch.is_unlimited,
      }

      if (!newBatch.is_unlimited && (isNaN(input.quantity!) || input.quantity! < 1)) {
        setError('Informe uma quantidade válida.')
        return
      }
      if (isNaN(input.price) || input.price < 0) {
        setError('Informe um preço válido.')
        return
      }

      await createBatch(eventId, ticketTypeId, input)
      setNewBatch({ name: '', price: '', quantity: '', is_unlimited: false })
      setShowCreateForm(false)
      await loadBatches()
      onBatchesChange?.()
      showSuccess('Lote criado com sucesso!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar lote')
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editingBatch) return
    setError(null)
    setProcessingId(editingBatch.id)
    try {
      const input: UpdateBatchInput = {
        name: editingBatch.name.trim(),
        price: parseFloat(editingBatch.price.replace(',', '.')),
        quantity: editingBatch.is_unlimited ? 0 : parseInt(editingBatch.quantity, 10),
        is_unlimited: editingBatch.is_unlimited,
      }

      if (!editingBatch.is_unlimited && (isNaN(input.quantity!) || input.quantity! < 1)) {
        setError('Informe uma quantidade válida.')
        return
      }
      if (isNaN(input.price!) || input.price! < 0) {
        setError('Informe um preço válido.')
        return
      }

      await updateBatch(editingBatch.id, input)
      setEditingBatch(null)
      await loadBatches()
      onBatchesChange?.()
      showSuccess('Lote atualizado com sucesso!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar lote')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleClose(batchId: string, batchName: string) {
    if (!confirm(`Encerrar o lote "${batchName}"? O próximo lote será aberto automaticamente.`)) return
    setError(null)
    setProcessingId(batchId)
    try {
      await closeBatch(batchId)
      await loadBatches()
      onBatchesChange?.()
      showSuccess('Lote encerrado com sucesso!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao encerrar lote')
    } finally {
      setProcessingId(null)
    }
  }

  async function handleDelete(batchId: string, batchName: string) {
    if (!confirm(`Excluir o lote "${batchName}" permanentemente?`)) return
    setError(null)
    setProcessingId(batchId)
    try {
      await deleteBatch(batchId)
      await loadBatches()
      onBatchesChange?.()
      showSuccess('Lote excluído!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir lote')
    } finally {
      setProcessingId(null)
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '0.45rem 0.7rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.85rem',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  }

  const btnPrimary: React.CSSProperties = {
    padding: '0.45rem 0.9rem',
    borderRadius: '6px',
    border: 'none',
    background: '#4f46e5',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.82rem',
    cursor: 'pointer',
  }

  const btnSecondary: React.CSSProperties = {
    padding: '0.45rem 0.85rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#334155',
    fontWeight: 500,
    fontSize: '0.82rem',
    cursor: 'pointer',
  }

  const btnDanger: React.CSSProperties = {
    padding: '0.35rem 0.7rem',
    borderRadius: '6px',
    border: 'none',
    background: 'transparent',
    color: '#dc2626',
    fontWeight: 600,
    fontSize: '0.75rem',
    cursor: 'pointer',
  }

  if (isLoading) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
        Carregando lotes...
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>
            🎫 Lotes — {ticketTypeName}
          </h4>
          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
            {batches.length === 0
              ? 'Nenhum lote configurado. Adicione o primeiro lote abaixo.'
              : `${batches.length} lote(s) configurado(s)`}
          </p>
        </div>
        {!showCreateForm && (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            style={btnPrimary}
          >
            + Adicionar lote
          </button>
        )}
      </div>

      {/* Feedback */}
      {error && (
        <div style={{ padding: '0.6rem 0.9rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.83rem' }}>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '0.6rem 0.9rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#15803d', fontSize: '0.83rem' }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Banner de Lote Vigente para o Organizador */}
      {(() => {
        const activeBatch = batches.find((b) => b.status === 'open')
        if (activeBatch) {
          return (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1.5px solid #86efac',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🟢</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <strong style={{ color: '#166534', fontSize: '0.92rem' }}>
                      Lote Vigente: {activeBatch.name}
                    </strong>
                    <span style={{
                      background: '#15803d',
                      color: '#fff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '999px',
                      textTransform: 'uppercase',
                    }}>
                      Ativo para Vendas
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#15803d' }}>
                    Preço atual: <strong>{formatCurrency(activeBatch.price)}</strong> • Restam <strong>{activeBatch.is_unlimited ? 'Ilimitados' : Math.max(0, activeBatch.quantity - activeBatch.sold - activeBatch.reserved)}</strong> ingressos
                  </p>
                </div>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>
                {activeBatch.sold} vendidos • {activeBatch.reserved} reservados
              </span>
            </div>
          )
        }
        if (batches.length > 0) {
          return (
            <div style={{
              padding: '0.6rem 0.9rem',
              borderRadius: '8px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#b45309',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span>⚠️</span>
              <span>Nenhum lote aberto no momento. Abra ou crie um lote para disponibilizar ingressos.</span>
            </div>
          )
        }
        return null
      })()}

      {/* Lista de lotes */}
      {batches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {batches.map((batch, idx) => {
            const colors = BATCH_STATUS_COLORS[batch.status]
            const available = getBatchAvailable(batch)
            const isEditing = editingBatch?.id === batch.id
            const isProcessing = processingId === batch.id

            if (isEditing) {
              return (
                <form
                  key={batch.id}
                  onSubmit={(e) => void handleUpdate(e)}
                  style={{
                    padding: '0.85rem',
                    border: '2px solid #4f46e5',
                    borderRadius: '10px',
                    background: '#f8f9ff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                  }}
                >
                  <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: '#4f46e5' }}>
                    Editando: {batch.name}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Nome</label>
                      <input
                        style={inputStyle}
                        value={editingBatch!.name}
                        onChange={(e) => setEditingBatch((prev) => prev && ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: 1º Lote"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Preço (R$)</label>
                      <input
                        style={inputStyle}
                        value={editingBatch!.price}
                        onChange={(e) => setEditingBatch((prev) => prev && ({ ...prev, price: e.target.value }))}
                        placeholder="0,00"
                        type="text"
                        inputMode="decimal"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                        Quantidade {editingBatch!.is_unlimited ? '(ilimitada)' : ''}
                      </label>
                      <input
                        style={inputStyle}
                        value={editingBatch!.is_unlimited ? '' : editingBatch!.quantity}
                        disabled={editingBatch!.is_unlimited}
                        onChange={(e) => setEditingBatch((prev) => prev && ({ ...prev, quantity: e.target.value }))}
                        placeholder="100"
                        type="number"
                        min={batch.sold + batch.reserved}
                      />
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editingBatch!.is_unlimited}
                      onChange={(e) => setEditingBatch((prev) => prev && ({ ...prev, is_unlimited: e.target.checked }))}
                    />
                    Quantidade ilimitada
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" style={btnPrimary} disabled={isProcessing}>
                      {isProcessing ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button type="button" style={btnSecondary} onClick={() => setEditingBatch(null)}>
                      Cancelar
                    </button>
                  </div>
                </form>
              )
            }

            return (
              <div
                key={batch.id}
                style={{
                  padding: '0.85rem 1rem',
                  border: batch.status === 'open' ? '2px solid #22c55e' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  background: batch.status === 'open' ? '#f0fdf4' : '#fff',
                  boxShadow: batch.status === 'open' ? '0 2px 10px rgba(34, 197, 94, 0.12)' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  opacity: isProcessing ? 0.6 : 1,
                  position: 'relative',
                }}
              >
                {/* Indicador "Ativo" */}
                {batch.status === 'open' && (
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '12px',
                    background: '#15803d',
                    color: '#fff',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    letterSpacing: '0.02em',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}>
                    🟢 LOTE VIGENTE • EM VENDA
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, minWidth: '20px' }}>
                    {idx + 1}
                  </span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                      {batch.name}
                    </p>
                    <p style={{ margin: '1px 0 0', fontSize: '0.78rem', color: '#475569' }}>
                      {formatCurrency(batch.price)} por ingresso
                    </p>
                  </div>
                </div>

                {/* Métricas */}
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: '#475569' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{batch.sold}</p>
                    <p style={{ margin: 0, fontSize: '0.7rem' }}>Vendidos</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: '#d97706' }}>{batch.reserved}</p>
                    <p style={{ margin: 0, fontSize: '0.7rem' }}>Reservados</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 700, color: available === 0 ? '#dc2626' : '#15803d' }}>
                      {batch.is_unlimited ? '∞' : (available ?? 0)}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.7rem' }}>Disponíveis</p>
                  </div>
                  {!batch.is_unlimited && (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: 0, fontWeight: 700 }}>{batch.quantity}</p>
                      <p style={{ margin: 0, fontSize: '0.7rem' }}>Total</p>
                    </div>
                  )}
                </div>

                {/* Status badge */}
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: colors.bg,
                  color: colors.color,
                  border: `1px solid ${colors.border}`,
                  textTransform: 'uppercase',
                }}>
                  {BATCH_STATUS_LABELS[batch.status]}
                </span>

                {/* Ações */}
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  {batch.status !== 'closed' && batch.status !== 'sold_out' && (
                    <button
                      type="button"
                      style={btnSecondary}
                      disabled={isProcessing}
                      onClick={() =>
                        setEditingBatch({
                          id: batch.id,
                          name: batch.name,
                          price: String(batch.price),
                          quantity: String(batch.quantity),
                          is_unlimited: batch.is_unlimited,
                        })
                      }
                    >
                      ✏️ Editar
                    </button>
                  )}
                  {(batch.status === 'open' || batch.status === 'future') && (
                    <button
                      type="button"
                      style={{ ...btnSecondary, color: '#d97706', borderColor: '#fde68a' }}
                      disabled={isProcessing}
                      onClick={() => void handleClose(batch.id, batch.name)}
                    >
                      Encerrar
                    </button>
                  )}
                  {batch.sold === 0 && batch.reserved === 0 && (
                    <button
                      type="button"
                      style={btnDanger}
                      disabled={isProcessing}
                      onClick={() => void handleDelete(batch.id, batch.name)}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Formulário de criação */}
      {showCreateForm && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          style={{
            padding: '0.85rem',
            border: '2px dashed #cbd5e1',
            borderRadius: '10px',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
            Novo lote
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Nome</label>
              <input
                style={inputStyle}
                value={newBatch.name}
                onChange={(e) => setNewBatch((p) => ({ ...p, name: e.target.value }))}
                placeholder={`${batches.length + 1}º Lote`}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Preço (R$)</label>
              <input
                style={inputStyle}
                value={newBatch.price}
                onChange={(e) => setNewBatch((p) => ({ ...p, price: e.target.value }))}
                placeholder="50,00"
                type="text"
                inputMode="decimal"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                Quantidade {newBatch.is_unlimited ? '(ilimitada)' : ''}
              </label>
              <input
                style={inputStyle}
                value={newBatch.is_unlimited ? '' : newBatch.quantity}
                disabled={newBatch.is_unlimited}
                onChange={(e) => setNewBatch((p) => ({ ...p, quantity: e.target.value }))}
                placeholder="100"
                type="number"
                min="1"
                required={!newBatch.is_unlimited}
              />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={newBatch.is_unlimited}
              onChange={(e) => setNewBatch((p) => ({ ...p, is_unlimited: e.target.checked }))}
            />
            Quantidade ilimitada
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" style={btnPrimary}>Criar lote</button>
            <button type="button" style={btnSecondary} onClick={() => setShowCreateForm(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Resumo do total configurado */}
      {batches.length > 0 && (
        <div style={{ padding: '0.6rem 0.9rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', fontSize: '0.8rem', color: '#0369a1' }}>
          <strong>Resumo:</strong>{' '}
          {batches.reduce((sum, b) => sum + b.sold, 0)} ingresso(s) vendido(s) •{' '}
          {batches.reduce((sum, b) => sum + b.reserved, 0)} reservado(s) •{' '}
          {batches.some((b) => b.is_unlimited)
            ? 'Quantidade ilimitada em algum lote'
            : `${batches.reduce((sum, b) => sum + b.quantity, 0)} ingressos configurados no total`}
        </div>
      )}
    </div>
  )
}

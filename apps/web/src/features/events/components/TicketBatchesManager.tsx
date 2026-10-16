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
  reopenBatch,
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

  const [reopeningBatch, setReopeningBatch] = useState<{
    id: string
    name: string
    sold: number
    reserved: number
    currentQuantity: number
    newQuantity: string
    price: string
    is_unlimited: boolean
  } | null>(null)

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

  async function handleReopen(e: React.FormEvent) {
    e.preventDefault()
    if (!reopeningBatch) return
    setError(null)
    setProcessingId(reopeningBatch.id)
    try {
      const isUnlimited = reopeningBatch.is_unlimited
      const qty = isUnlimited ? 0 : parseInt(reopeningBatch.newQuantity, 10)
      const price = parseFloat(reopeningBatch.price.replace(',', '.'))
      const minRequired = reopeningBatch.sold + reopeningBatch.reserved

      if (!isUnlimited && (isNaN(qty) || qty <= minRequired)) {
        setError(`A nova quantidade deve ser maior que ${minRequired} (ingressos já vendidos e reservados).`)
        setProcessingId(null)
        return
      }
      if (isNaN(price) || price < 0) {
        setError('Informe um preço válido.')
        setProcessingId(null)
        return
      }

      await reopenBatch(reopeningBatch.id, {
        quantity: isUnlimited ? 0 : qty,
        price,
        is_unlimited: isUnlimited,
      })

      const targetName = reopeningBatch.name
      setReopeningBatch(null)
      await loadBatches()
      onBatchesChange?.()
      showSuccess(`O ${targetName} foi reativado com sucesso como lote vigente!`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao reabrir lote')
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
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Botão de Voltar para este lote (Reabrir) */}
                  {(batch.status === 'sold_out' || batch.status === 'closed') && (
                    <button
                      type="button"
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '6px',
                        border: '1px solid #86efac',
                        background: '#f0fdf4',
                        color: '#15803d',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                      disabled={isProcessing}
                      onClick={() =>
                        setReopeningBatch({
                          id: batch.id,
                          name: batch.name,
                          sold: batch.sold,
                          reserved: batch.reserved,
                          currentQuantity: batch.quantity,
                          newQuantity: String(Math.max(batch.quantity + 10, batch.sold + batch.reserved + 10)),
                          price: String(batch.price),
                          is_unlimited: batch.is_unlimited,
                        })
                      }
                      title={`Voltar para o ${batch.name} e aumentar quantidade`}
                    >
                      <span>↩️</span>
                      <span>Voltar para este lote</span>
                    </button>
                  )}

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

      {/* Modal de Reabertura de Lote (Voltar para o Lote Anterior) */}
      {reopeningBatch && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
          onClick={() => !processingId && setReopeningBatch(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#dcfce7',
                color: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                flexShrink: 0,
              }}>
                ↩️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 800 }}>
                  Voltar para o {reopeningBatch.name}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Reativar vendas com o preço e condições deste lote
                </p>
              </div>
            </div>

            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              padding: '0.75rem 0.9rem',
              fontSize: '0.82rem',
              color: '#166534',
              lineHeight: 1.45,
            }}>
              Ao reabrir este lote, ele voltará imediatamente a ser o <strong>lote vigente para vendas</strong>. Qualquer lote posterior que estava aberto será pausado e continuará automaticamente quando este esgotar novamente.
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '0.75rem 0.9rem',
              fontSize: '0.8rem',
              color: '#475569',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>Ingressos já vendidos neste lote:</span>
              <strong style={{ color: '#0f172a' }}>{reopeningBatch.sold} vendidos ({reopeningBatch.reserved} reservados)</strong>
            </div>

            <form onSubmit={(e) => void handleReopen(e)} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Nova Quantidade Total de Ingressos {!reopeningBatch.is_unlimited && '*'}
                </label>
                <input
                  style={inputStyle}
                  type="number"
                  disabled={reopeningBatch.is_unlimited}
                  min={reopeningBatch.sold + reopeningBatch.reserved + 1}
                  value={reopeningBatch.is_unlimited ? '' : reopeningBatch.newQuantity}
                  onChange={(e) => setReopeningBatch((prev) => prev && ({ ...prev, newQuantity: e.target.value }))}
                  placeholder={`Mínimo: ${reopeningBatch.sold + reopeningBatch.reserved + 1}`}
                  required={!reopeningBatch.is_unlimited}
                />
                {!reopeningBatch.is_unlimited && (
                  <span style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
                    {(() => {
                      const qty = parseInt(reopeningBatch.newQuantity, 10)
                      const minReq = reopeningBatch.sold + reopeningBatch.reserved
                      if (!isNaN(qty) && qty > minReq) {
                        return `✨ Serão disponibilizados ${qty - minReq} novos ingressos para venda imediata.`
                      }
                      return `Informe mais de ${minReq} ingressos para haver vagas disponíveis.`
                    })()}
                  </span>
                )}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={reopeningBatch.is_unlimited}
                  onChange={(e) => setReopeningBatch((prev) => prev && ({ ...prev, is_unlimited: e.target.checked }))}
                />
                Deixar quantidade ilimitada
              </label>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Preço por Ingresso (R$) *
                </label>
                <input
                  style={inputStyle}
                  type="text"
                  inputMode="decimal"
                  value={reopeningBatch.price}
                  onChange={(e) => setReopeningBatch((prev) => prev && ({ ...prev, price: e.target.value }))}
                  placeholder="0,00"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  style={btnSecondary}
                  disabled={processingId === reopeningBatch.id}
                  onClick={() => setReopeningBatch(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingId === reopeningBatch.id}
                  style={{
                    padding: '0.55rem 1.1rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#16a34a',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: processingId === reopeningBatch.id ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)',
                  }}
                >
                  {processingId === reopeningBatch.id ? 'Reativando...' : `Confirmar e Voltar para o ${reopeningBatch.name}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

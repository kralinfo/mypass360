'use client'

import { useCallback, useEffect, useState } from 'react'
import type { EventCustomField } from '@mypass360/types'
import { createClient } from '@/lib/supabase/client'
import {
  fetchActiveCustomFields,
  fetchAllCustomFields,
  fetchCheckinDisplayFields,
  saveCheckinDisplayFields,
} from '@/features/custom-fields/custom-fields.service'

interface CheckinDisplayFieldsConfigProps {
  eventId: string
  /** Opcional: callback quando as configurações forem salvas */
  onSaved?: () => void
}

export function CheckinDisplayFieldsConfig({ eventId, onSaved }: CheckinDisplayFieldsConfigProps) {
  const [availableFields, setAvailableFields] = useState<EventCustomField[]>([])
  const [selectedFieldIds, setSelectedFieldIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null)

  // Carrega campos do evento e a configuração atual salva
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setFeedbackMessage(null)
    try {
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) {
        setIsLoading(false)
        return
      }

      // Busca todos os campos do evento (ativos) e a configuração salva de check-in em paralelo
      const [allFields, savedDisplayFields] = await Promise.all([
        fetchAllCustomFields(eventId, token).catch(() => fetchActiveCustomFields(eventId)),
        fetchCheckinDisplayFields(eventId, token).catch(() => []),
      ])

      // Filtra apenas campos ativos
      const activeFields = allFields.filter((f) => f.is_active !== false && f.id)
      setAvailableFields(activeFields)

      // Monta a ordem atual selecionada conforme gravado no banco
      const validFieldIds = new Set(activeFields.map((f) => f.id!))
      const savedIds = savedDisplayFields
        .map((d) => d.fieldId)
        .filter((id) => validFieldIds.has(id))
        .slice(0, 3)

      setSelectedFieldIds(savedIds)
    } catch (err) {
      // Silencioso no carregamento
    } finally {
      setIsLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Alterna seleção de um campo respeitando o limite máximo de 3
  const handleToggleField = (fieldId: string) => {
    setFeedbackMessage(null)
    const isCurrentlySelected = selectedFieldIds.includes(fieldId)

    if (isCurrentlySelected) {
      // Desmarca o campo
      setSelectedFieldIds((prev) => prev.filter((id) => id !== fieldId))
    } else {
      // Tenta marcar o campo
      if (selectedFieldIds.length >= 3) {
        setFeedbackMessage({
          type: 'warning',
          text: 'Você pode exibir no máximo 3 informações adicionais no Check-in.',
        })
        return
      }
      setSelectedFieldIds((prev) => [...prev, fieldId])
    }
  }

  // Altera a ordem de um campo selecionado (mover para cima)
  const handleMoveUp = (index: number) => {
    if (index <= 0) return
    setSelectedFieldIds((prev) => {
      const next = [...prev]
      const temp = next[index - 1]
      next[index - 1] = next[index]
      next[index] = temp
      return next
    })
  }

  // Altera a ordem de um campo selecionado (mover para baixo)
  const handleMoveDown = (index: number) => {
    if (index >= selectedFieldIds.length - 1) return
    setSelectedFieldIds((prev) => {
      const next = [...prev]
      const temp = next[index + 1]
      next[index + 1] = next[index]
      next[index] = temp
      return next
    })
  }

  // Salva a configuração no banco
  const handleSave = async () => {
    if (selectedFieldIds.length > 3) {
      setFeedbackMessage({
        type: 'warning',
        text: 'Você pode exibir no máximo 3 informações adicionais no Check-in.',
      })
      return
    }

    setIsSaving(true)
    setFeedbackMessage(null)

    try {
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Sessão expirada. Faça login novamente.')

      await saveCheckinDisplayFields(eventId, token, selectedFieldIds)

      setFeedbackMessage({
        type: 'success',
        text: 'Configuração salva com sucesso.',
      })
      onSaved?.()
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Erro ao salvar configuração do Check-in.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div
        style={{
          padding: '1.25rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          color: '#64748b',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <div style={{ width: 16, height: 16, border: '2px solid #cbd5e1', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        Carregando informações do Check-in...
      </div>
    )
  }

  // Evento sem campos personalizados
  if (availableFields.length === 0) {
    return (
      <div
        style={{
          padding: '1.25rem',
          borderRadius: '12px',
          border: '1px dashed #cbd5e1',
          background: '#f8fafc',
          display: 'grid',
          gap: '0.4rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>📋</span>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
            Informações exibidas no Check-in
          </h4>
        </div>
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
          Este evento não possui campos personalizados cadastrados. Caso adicione perguntas adicionais aos ingressos, você poderá escolher até 3 para aparecerem na tela do operador após a leitura do QR Code.
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: '1.25rem',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        background: '#ffffff',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        display: 'grid',
        gap: '1rem',
      }}
    >
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>📋</span>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
              Informações exibidas no Check-in
            </h4>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Escolha até 3 informações adicionais para mostrar ao operador após a leitura do ingresso.
          </p>
        </div>

        {/* Contador */}
        <span
          style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '20px',
            background: selectedFieldIds.length === 3 ? '#fef3c7' : '#f1f5f9',
            color: selectedFieldIds.length === 3 ? '#92400e' : '#475569',
            border: selectedFieldIds.length === 3 ? '1px solid #fde68a' : '1px solid #e2e8f0',
            whiteSpace: 'nowrap',
          }}
        >
          {selectedFieldIds.length}/3 selecionadas
        </span>
      </div>

      {/* Banner de feedback / aviso */}
      {feedbackMessage && (
        <div
          style={{
            padding: '0.65rem 0.95rem',
            borderRadius: '8px',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background:
              feedbackMessage.type === 'success'
                ? '#f0fdf4'
                : feedbackMessage.type === 'warning'
                ? '#fffbeb'
                : '#fef2f2',
            border:
              feedbackMessage.type === 'success'
                ? '1px solid #86efac'
                : feedbackMessage.type === 'warning'
                ? '1px solid #fde68a'
                : '1px solid #fca5a5',
            color:
              feedbackMessage.type === 'success'
                ? '#166534'
                : feedbackMessage.type === 'warning'
                ? '#92400e'
                : '#991b1b',
            fontWeight: 600,
          }}
        >
          <span>
            {feedbackMessage.type === 'success' ? '✓' : feedbackMessage.type === 'warning' ? '⚠️' : '✕'}
          </span>
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Lista de Campos Disponíveis */}
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Campos disponíveis:
        </span>

        <div style={{ display: 'grid', gap: '0.45rem' }}>
          {availableFields.map((field) => {
            const isSelected = selectedFieldIds.includes(field.id!)
            const orderIndex = selectedFieldIds.indexOf(field.id!)

            return (
              <div
                key={field.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  background: isSelected ? '#f8fafc' : '#ffffff',
                  border: isSelected ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                  transition: 'all 0.15s ease',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleField(field.id!)}
                    style={{
                      width: 17,
                      height: 17,
                      accentColor: '#4f46e5',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.86rem',
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#1e1b4b' : '#334155',
                      }}
                    >
                      {field.label}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      ({field.field_type === 'select' ? 'Seleção' : field.field_type === 'number' ? 'Número' : 'Texto'})
                    </span>
                  </div>
                </label>

                {/* Controles de Ordem para os itens selecionados */}
                {isSelected && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '6px',
                        background: '#e0e7ff',
                        color: '#3730a3',
                      }}
                      title={`Ordem de exibição: ${orderIndex + 1}º`}
                    >
                      #{orderIndex + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleMoveUp(orderIndex)}
                      disabled={orderIndex === 0}
                      title="Mover para cima"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: orderIndex === 0 ? '#cbd5e1' : '#475569',
                        cursor: orderIndex === 0 ? 'not-allowed' : 'pointer',
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                    >
                      ▲
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveDown(orderIndex)}
                      disabled={orderIndex === selectedFieldIds.length - 1}
                      title="Mover para baixo"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: orderIndex === selectedFieldIds.length - 1 ? '#cbd5e1' : '#475569',
                        cursor: orderIndex === selectedFieldIds.length - 1 ? 'not-allowed' : 'pointer',
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                    >
                      ▼
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Botão de Salvar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.75rem', marginTop: '0.25rem' }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          style={{
            padding: '0.55rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            background: '#0f172a',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'background 0.15s ease',
          }}
        >
          {isSaving ? 'Salvando...' : 'Salvar configurações'}
        </button>

        {selectedFieldIds.length === 0 && (
          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
            Nenhum campo selecionado (o check-in exibirá apenas os dados padrão).
          </span>
        )}
      </div>
    </div>
  )
}

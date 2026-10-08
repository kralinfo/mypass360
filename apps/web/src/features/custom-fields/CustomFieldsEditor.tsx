'use client'

import type { EventCustomField, EventCustomFieldType } from '@mypass360/types'

interface Props {
  fields: EventCustomField[]
  onChange: (fields: EventCustomField[]) => void
}

const TYPE_LABELS: Record<EventCustomFieldType, string> = {
  text: 'Texto',
  number: 'Número',
  select: 'Seleção (lista de opções)',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.65rem',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
  background: '#fff',
}

const smallButton: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  background: '#fff',
  borderRadius: '6px',
  padding: '0.25rem 0.55rem',
  cursor: 'pointer',
  fontSize: '0.8rem',
}

const chipButton: React.CSSProperties = {
  border: '1px solid #c7d2fe',
  background: '#eef2ff',
  color: '#3730a3',
  borderRadius: '999px',
  padding: '0.35rem 0.8rem',
  cursor: 'pointer',
  fontSize: '0.82rem',
  fontWeight: 600,
}

const TEMPLATES: { name: string; build: () => EventCustomField }[] = [
  {
    name: 'Tamanho da camisa',
    build: () => ({
      label: 'Tamanho da camisa',
      field_type: 'select',
      required: true,
      options: ['P', 'M', 'G', 'GG'].map((label) => ({ label })),
    }),
  },
  {
    name: 'Número do calçado',
    build: () => ({ label: 'Número do calçado', field_type: 'number', required: false, options: [] }),
  },
]

/** Editor simples dos campos personalizados cobrados de cada participante. */
export function CustomFieldsEditor({ fields, onChange }: Props) {
  const update = (index: number, patch: Partial<EventCustomField>) =>
    onChange(fields.map((field, i) => (i === index ? { ...field, ...patch } : field)))

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= fields.length) return
    const next = [...fields]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const updateOption = (fieldIndex: number, optionIndex: number, label: string) => {
    const options = fields[fieldIndex].options.map((o, i) => (i === optionIndex ? { ...o, label } : o))
    update(fieldIndex, { options })
  }

  return (
    <section style={{ background: '#fff', borderRadius: '14px', padding: '1.1rem', border: '1px solid #e2e8f0', display: 'grid', gap: '0.9rem' }}>
      <header style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>Vai existir algum produto?</h2>
        <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.85rem' }}>
          Vai entregar camisa, kit ou outro item? Precisa de mais alguma informação de cada participante, como tamanho da camisa ou número do calçado? As perguntas aparecem na compra ou inscrição e as respostas ficam na lista de ingressos.
        </p>
      </header>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Adicionar:</span>
        {TEMPLATES.map((template) => (
          <button key={template.name} type="button" onClick={() => onChange([...fields, template.build()])} style={chipButton}>
            + {template.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange([...fields, { label: '', field_type: 'text', required: false, options: [] }])}
          style={chipButton}
        >
          + Outro campo
        </button>
      </div>

      {fields.length === 0 && (
        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '0.9rem', color: '#64748b', fontSize: '0.85rem' }}>
          Nenhum produto ou informação extra. Se não vai entregar nada, pode deixar assim.
        </div>
      )}
      {fields.length > 0 && (
        <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.9rem' }}>
          {fields.map((field, index) => (
            <div
              key={field.id ?? `new-${index}`}
              style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem', display: 'grid', gap: '0.6rem' }}
            >
              <div style={{ display: 'grid', gap: '0.6rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Nome do campo *</label>
                  <input
                    value={field.label}
                    onChange={(e) => update(index, { label: e.target.value })}
                    placeholder="Ex: Tamanho da camisa"
                    maxLength={80}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Tipo</label>
                  <select
                    value={field.field_type}
                    onChange={(e) => {
                      const field_type = e.target.value as EventCustomFieldType
                      update(index, {
                        field_type,
                        options: field_type === 'select' && field.options.length === 0 ? [{ label: '' }] : field.options,
                      })
                    }}
                    style={inputStyle}
                  >
                    {(Object.keys(TYPE_LABELS) as EventCustomFieldType[]).map((type) => (
                      <option key={type} value={type}>
                        {TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {field.field_type === 'select' && (
                <div style={{ display: 'grid', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Opções</label>
                  {field.options.map((option, optionIndex) => (
                    <div key={option.id ?? `opt-${optionIndex}`} style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        value={option.label}
                        onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                        placeholder={`Opção ${optionIndex + 1}`}
                        maxLength={80}
                        style={inputStyle}
                      />
                      <button
                        type="button"
                        aria-label="Remover opção"
                        onClick={() => update(index, { options: field.options.filter((_, i) => i !== optionIndex) })}
                        style={smallButton}
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => update(index, { options: [...field.options, { label: '' }] })}
                    style={{ ...smallButton, justifySelf: 'start' }}
                  >
                    + Adicionar opção
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => update(index, { required: e.target.checked })}
                  />
                  Obrigatório
                </label>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} style={smallButton} aria-label="Mover para cima">
                    Subir
                  </button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === fields.length - 1} style={smallButton} aria-label="Mover para baixo">
                    Descer
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(fields.filter((_, i) => i !== index))}
                    style={{ ...smallButton, color: '#dc2626', borderColor: '#fecaca' }}
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

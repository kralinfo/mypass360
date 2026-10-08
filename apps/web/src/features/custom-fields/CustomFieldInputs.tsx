'use client'

import type { EventCustomField } from '@mypass360/types'

interface Props {
  fields: EventCustomField[]
  values: Record<string, string>
  onChange: (fieldId: string, value: string) => void
  idPrefix: string
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '0.9rem',
  boxSizing: 'border-box',
  background: '#fff',
}

/** Renderiza os campos personalizados do evento para um participante. */
export function CustomFieldInputs({ fields, values, onChange, idPrefix }: Props) {
  if (fields.length === 0) return null

  return (
    <>
      {fields.map((field) => {
        const fieldId = field.id ?? ''
        const inputId = `${idPrefix}-${fieldId}`
        const value = values[fieldId] ?? ''

        return (
          <div key={fieldId}>
            <label
              htmlFor={inputId}
              style={{ display: 'block', marginBottom: '0.3rem', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}
            >
              {field.label}
              {field.required ? ' *' : ' (opcional)'}
            </label>
            {field.field_type === 'select' ? (
              <select
                id={inputId}
                value={value}
                onChange={(e) => onChange(fieldId, e.target.value)}
                required={field.required}
                style={inputStyle}
              >
                <option value="">Selecione...</option>
                {field.options.map((option) => (
                  <option key={option.id ?? option.label} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={inputId}
                type={field.field_type === 'number' ? 'number' : 'text'}
                inputMode={field.field_type === 'number' ? 'decimal' : undefined}
                value={value}
                onChange={(e) => onChange(fieldId, e.target.value)}
                required={field.required}
                maxLength={field.field_type === 'text' ? 200 : undefined}
                style={inputStyle}
              />
            )}
          </div>
        )
      })}
    </>
  )
}

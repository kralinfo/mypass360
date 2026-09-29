'use client'

import { useState, useEffect } from 'react'

export interface SelectedLocation {
  formattedAddress: string
  city: string | null
  state: string | null
  latitude: number | null
  longitude: number | null
  placeId: string | null
}

interface LocationAutocompleteInputProps {
  value: string
  cityValue?: string
  stateValue?: string
  onChange: (value: string) => void
  onLocationSelect: (location: SelectedLocation) => void
  disabled?: boolean
  required?: boolean
}

export function LocationAutocompleteInput({
  value,
  cityValue = '',
  stateValue = '',
  onChange,
  onLocationSelect,
  disabled = false,
  required = false,
}: LocationAutocompleteInputProps) {
  const [city, setCity] = useState(cityValue)
  const [state, setState] = useState(stateValue)

  useEffect(() => {
    setCity(cityValue)
  }, [cityValue])

  useEffect(() => {
    setState(stateValue)
  }, [stateValue])

  function handleLocationChange(newLocation: string) {
    onChange(newLocation)
    onLocationSelect({
      formattedAddress: newLocation,
      city: city.trim() || null,
      state: state.trim() || null,
      latitude: null,
      longitude: null,
      placeId: null,
    })
  }

  function handleCityChange(newCity: string) {
    setCity(newCity)
    onLocationSelect({
      formattedAddress: value,
      city: newCity.trim() || null,
      state: state.trim() || null,
      latitude: null,
      longitude: null,
      placeId: null,
    })
  }

  function handleStateChange(newState: string) {
    setState(newState)
    onLocationSelect({
      formattedAddress: value,
      city: city.trim() || null,
      state: newState.trim() || null,
      latitude: null,
      longitude: null,
      placeId: null,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {/* Campo principal de localização */}
      <div>
        <label
          htmlFor="location_input"
          style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: '500', color: '#334155' }}
        >
          Local do Evento {required ? '*' : ''}
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            id="location_input"
            name="location"
            value={value}
            onChange={(e) => handleLocationChange(e.target.value)}
            disabled={disabled}
            required={required}
            placeholder="Ex: Allianz Parque, Av. Francisco Matarazzo, 1705 — São Paulo, SP"
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem 0.65rem 2.4rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.95rem',
              boxSizing: 'border-box',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '1rem',
              pointerEvents: 'none',
            }}
          >
            📍
          </span>
        </div>
      </div>

      {/* Cidade e Estado (para filtro) */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '0.75rem',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '0.5rem',
        }}
      >
        <div>
          <label
            htmlFor="location_city"
            style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}
          >
            Cidade (para filtro)
          </label>
          <input
            type="text"
            id="location_city"
            value={city}
            onChange={(e) => handleCityChange(e.target.value)}
            placeholder="Ex: São Paulo"
            disabled={disabled}
            style={{
              width: '100%',
              padding: '0.45rem 0.6rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.88rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="location_state"
            style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}
          >
            UF
          </label>
          <input
            type="text"
            id="location_state"
            value={state}
            onChange={(e) => handleStateChange(e.target.value.toUpperCase())}
            placeholder="SP"
            maxLength={2}
            disabled={disabled}
            style={{
              width: '100%',
              padding: '0.45rem 0.6rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.88rem',
              textTransform: 'uppercase',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
        💡 O endereço digitado será usado como link para o Google Maps na página do evento.
      </p>
    </div>
  )
}

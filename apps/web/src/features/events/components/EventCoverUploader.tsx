'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ImageCropModal } from './ImageCropModal'

interface EventCoverUploaderProps {
  value?: string | null
  onChange: (url: string | null) => void
  eventId?: string
}

export function EventCoverUploader({ value, onChange, eventId }: EventCoverUploaderProps) {
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    // Validações de tipo e tamanho
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Formato inválido. Por favor, envie uma imagem JPG, PNG ou WebP.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('A imagem selecionada é muito grande. O limite máximo é de 10 MB.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Carregar para o modal de enquadramento
    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImageSrc(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCropConfirm = async (croppedBlob: Blob) => {
    setSelectedImageSrc(null)
    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Sessão expirada. Faça login para fazer upload.')
      }

      const userId = session.user.id
      const timestamp = Date.now()
      const fileName = `${eventId || 'temp'}-${timestamp}.webp`
      const filePath = `covers/${userId}/${fileName}`

      // Upload para o Supabase Storage (Bucket 'events')
      const { error: uploadError } = await supabase.storage
        .from('events')
        .upload(filePath, croppedBlob, {
          contentType: 'image/webp',
          upsert: true,
        })

      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`)
      }

      // Obter URL pública do arquivo
      const {
        data: { publicUrl },
      } = supabase.storage.from('events').getPublicUrl(filePath)

      onChange(publicUrl)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar imagem do evento.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemove = () => {
    onChange(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <label
        style={{
          display: 'block',
          fontSize: '0.9rem',
          fontWeight: 700,
          color: '#1e293b',
          marginBottom: '0.5rem',
        }}
      >
        Foto de Capa do Evento
      </label>

      {/* Input de Arquivo Oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Mensagem de Erro */}
      {error && (
        <div
          style={{
            padding: '0.6rem 0.85rem',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            color: '#991b1b',
            fontSize: '0.8rem',
            marginBottom: '0.75rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Pré-visualização ou Dropzone */}
      {value ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            maxHeight: '260px',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid #cbd5e1',
            background: '#0f172a',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          }}
        >
          <img
            src={value}
            alt="Capa do Evento"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />

          {/* Overlay de Ações */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'flex-end',
              padding: '0.75rem',
              gap: '0.5rem',
            }}
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(4px)',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Alterar Foto
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.85)',
                backdropFilter: 'blur(4px)',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Remover
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{
            width: '100%',
            aspectRatio: '16/9',
            maxHeight: '190px',
            borderRadius: '12px',
            border: '2px dashed #cbd5e1',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            padding: '1rem',
            textAlign: 'center',
          }}
        >
          {uploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  border: '3px solid #cbd5e1',
                  borderTopColor: '#4f46e5',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                Enviando imagem...
              </span>
            </div>
          ) : (
            <>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#e0e7ff',
                  color: '#4f46e5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  marginBottom: '0.5rem',
                }}
              >
                📷
              </div>
              <strong style={{ fontSize: '0.9rem', color: '#0f172a', marginBottom: '0.2rem' }}>
                Adicionar Foto de Capa
              </strong>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                Clique para selecionar. Proporção 16:9 com ajuste interativo (JPG, PNG ou WebP até 10MB)
              </p>
            </>
          )}
        </div>
      )}

      {/* Modal de Enquadramento Interativo */}
      {selectedImageSrc && (
        <ImageCropModal
          imageSrc={selectedImageSrc}
          onConfirm={handleCropConfirm}
          onClose={() => {
            setSelectedImageSrc(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
          }}
        />
      )}
    </div>
  )
}

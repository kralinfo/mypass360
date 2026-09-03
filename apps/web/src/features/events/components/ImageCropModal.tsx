'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface ImageCropModalProps {
  imageSrc: string
  onConfirm: (croppedBlob: Blob, previewUrl: string) => void
  onClose: () => void
}

const TARGET_WIDTH = 1200
const TARGET_HEIGHT = 675 // 16:9

export function ImageCropModal({ imageSrc, onConfirm, onClose }: ImageCropModalProps) {
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [baseSize, setBaseSize] = useState<{ width: number; height: number } | null>(null)

  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)

  // Quando a imagem carrega, calcula o tamanho base para cobrir o enquadramento 16:9
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const frame = frameRef.current
    if (!frame) return

    const frameRect = frame.getBoundingClientRect()
    const frameW = frameRect.width || 440
    const frameH = frameRect.height || 247.5

    // Escala para cobrir todo o enquadramento (cover mode)
    const scale = Math.max(frameW / img.naturalWidth, frameH / img.naturalHeight)
    const baseW = img.naturalWidth * scale
    const baseH = img.naturalHeight * scale

    setBaseSize({ width: baseW, height: baseH })
    setPosition({ x: 0, y: 0 })
    setZoom(1)
  }

  // Touch / Mouse Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    },
    [isDragging, dragStart]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    })
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Recorte preciso via HTML5 Canvas
  const handleApplyCrop = () => {
    if (!imageRef.current || !frameRef.current) return

    const image = imageRef.current
    const frame = frameRef.current
    const frameRect = frame.getBoundingClientRect()
    const imgRect = image.getBoundingClientRect()

    const canvas = document.createElement('canvas')
    canvas.width = TARGET_WIDTH
    canvas.height = TARGET_HEIGHT
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Proporção entre pixels nativos da imagem e pixels visíveis na tela
    const ratioX = image.naturalWidth / imgRect.width
    const ratioY = image.naturalHeight / imgRect.height

    // Região da imagem que está exatamente dentro do frameRect
    const sourceX = (frameRect.left - imgRect.left) * ratioX
    const sourceY = (frameRect.top - imgRect.top) * ratioY
    const sourceWidth = frameRect.width * ratioX
    const sourceHeight = frameRect.height * ratioY

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      TARGET_WIDTH,
      TARGET_HEIGHT
    )

    // Converter para WebP Blob (qualidade 85%)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const previewUrl = URL.createObjectURL(blob)
        onConfirm(blob, previewUrl)
      },
      'image/webp',
      0.85
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <style>{`
        .crop-slider::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
      `}</style>

      {/* Card Principal */}
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#1e293b',
          borderRadius: '16px',
          border: '1px solid #334155',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem', fontWeight: 700 }}>
              Ajustar Foto do Evento
            </h3>
            <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: '0.78rem' }}>
              Arraste para posicionar e use o zoom para enquadrar perfeitamente
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.25rem',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Viewport de Recorte Interativo (Estilo WhatsApp) */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: '100%',
            height: '340px',
            background: '#0f172a',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            touchAction: 'none',
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Imagem a ser manipulada */}
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Ajuste do Evento"
            onLoad={handleImageLoad}
            style={{
              width: baseSize ? `${baseSize.width}px` : 'auto',
              height: baseSize ? `${baseSize.height}px` : 'auto',
              maxWidth: 'none',
              maxHeight: 'none',
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.05s ease-out',
              pointerEvents: 'none',
              opacity: baseSize ? 1 : 0,
            }}
          />

          {/* Máscara e Janela de Enquadramento 16:9 */}
          <div
            ref={frameRef}
            style={{
              position: 'absolute',
              width: '88%',
              maxWidth: '440px',
              aspectRatio: '16/9',
              boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.78)',
              border: '2px solid #6366f1',
              borderRadius: '8px',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Linhas de grade sutis (Regra dos Terços) */}
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gridTemplateRows: '1fr 1fr 1fr',
                opacity: 0.3,
              }}
            >
              <div style={{ borderRight: '1px dashed #ffffff', borderBottom: '1px dashed #ffffff' }} />
              <div style={{ borderRight: '1px dashed #ffffff', borderBottom: '1px dashed #ffffff' }} />
              <div style={{ borderBottom: '1px dashed #ffffff' }} />
              <div style={{ borderRight: '1px dashed #ffffff', borderBottom: '1px dashed #ffffff' }} />
              <div style={{ borderRight: '1px dashed #ffffff', borderBottom: '1px dashed #ffffff' }} />
              <div style={{ borderBottom: '1px dashed #ffffff' }} />
              <div style={{ borderRight: '1px dashed #ffffff' }} />
              <div style={{ borderRight: '1px dashed #ffffff' }} />
              <div />
            </div>
          </div>
        </div>

        {/* Controles de Zoom */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: '#1e293b',
            borderTop: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Zoom</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: '1px solid #475569',
              background: '#334155',
              color: '#f8fafc',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            -
          </button>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="crop-slider"
            style={{
              flex: 1,
              accentColor: '#6366f1',
              height: '6px',
              borderRadius: '3px',
              background: '#334155',
              cursor: 'pointer',
            }}
          />
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: '1px solid #475569',
              background: '#334155',
              color: '#f8fafc',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            +
          </button>
          <span style={{ fontSize: '0.78rem', color: '#cbd5e1', minWidth: '38px', textAlign: 'right' }}>
            {zoom}x
          </span>
        </div>

        {/* Rodapé com Ações */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            background: '#0f172a',
            borderTop: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: '1px solid #475569',
              background: 'transparent',
              color: '#cbd5e1',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleApplyCrop}
            style={{
              padding: '0.55rem 1.2rem',
              borderRadius: '8px',
              border: 'none',
              background: '#4f46e5',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
            }}
          >
            Aplicar Enquadramento
          </button>
        </div>
      </div>
    </div>
  )
}

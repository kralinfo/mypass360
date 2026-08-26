'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import type {
  CheckinAuthResponse,
  CheckinRecord,
  CheckinValidationResult,
} from '@mypass360/types'
import { fetchRecentCheckins, validateCheckinTicket } from '../checkin.service'

interface CheckinTerminalProps {
  authData: CheckinAuthResponse
  onLogout: () => void
}

function formatCpf(cpf: string | null | undefined): string {
  if (!cpf) return '—'
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeStyle: 'medium',
      dateStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

export function CheckinTerminal({ authData, onLogout }: CheckinTerminalProps) {
  const { access, event } = authData

  const [manualCode, setManualCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [result, setResult] = useState<CheckinValidationResult | null>(null)
  const [recentEntries, setRecentEntries] = useState<CheckinRecord[]>([])
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Contadores ao vivo
  const [checkedInCount, setCheckedInCount] = useState(event.checkedInTickets)
  const totalTickets = event.totalTickets
  const attendanceRate = totalTickets > 0 ? Math.round((checkedInCount / totalTickets) * 100) : 0

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const lastScannedCodeRef = useRef<string | null>(null)
  const scanThrottleRef = useRef<number>(0)
  const usbBufferRef = useRef<string>('')
  const usbLastKeyTimeRef = useRef<number>(0)
  const isPausedRef = useRef(false)

  // Atualiza a flag de pausa sempre que o resultado ou validação mudar
  isPausedRef.current = result !== null || isValidating

  // Pausar/retomar processamento da câmera durante os 5 segundos de exibição do aviso
  useEffect(() => {
    if (!html5QrCodeRef.current || !cameraActive) return
    try {
      if (result !== null) {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.pause(true)
        }
      } else {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.resume()
        }
      }
    } catch {
      // Silencioso
    }
  }, [result, cameraActive])

  // Temporizador para esconder o aviso de check-in / erro após 5 segundos
  useEffect(() => {
    if (!result) return
    const timer = setTimeout(() => {
      setResult(null)
    }, 5000)
    return () => clearTimeout(timer)
  }, [result])

  // Carregar histórico recente
  const loadRecent = useCallback(async () => {
    try {
      const records = await fetchRecentCheckins(access.code)
      setRecentEntries(records)
    } catch {
      // Silencioso
    }
  }, [access.code])

  useEffect(() => {
    loadRecent()
  }, [loadRecent])

  // Função central de validação
  const handleValidate = useCallback(
    async (codeToValidate: string) => {
      const trimmed = codeToValidate.trim()
      if (!trimmed || isValidating || isPausedRef.current) return

      // Evita duplo scan acidental no mesmo segundo
      const now = Date.now()
      if (lastScannedCodeRef.current === trimmed && now - scanThrottleRef.current < 2500) {
        return
      }

      lastScannedCodeRef.current = trimmed
      scanThrottleRef.current = now

      setIsValidating(true)

      try {
        const res = await validateCheckinTicket(trimmed, access.code)
        setResult(res)

        if (res.valid) {
          setCheckedInCount((c) => c + 1)
          setManualCode('')
          loadRecent()
        }
      } catch (err) {
        setResult({
          valid: false,
          reason: err instanceof Error ? err.message : 'Erro na comunicação com o servidor.',
        })
      } finally {
        setIsValidating(false)
      }
    },
    [access.code, isValidating, loadRecent]
  )


  // Listener para leitor físico USB / Bluetooth (emulador de teclado)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Se o foco já está num input específico, deixa o comportamento normal
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      const now = Date.now()
      const timeDiff = now - usbLastKeyTimeRef.current
      usbLastKeyTimeRef.current = now

      if (e.key === 'Enter') {
        if (usbBufferRef.current.length >= 6) {
          const code = usbBufferRef.current
          usbBufferRef.current = ''
          handleValidate(code)
        } else {
          usbBufferRef.current = ''
        }
        return
      }

      // Se a digitação for rápida (típico de leitor de código de barras: < 50ms entre caracteres)
      if (timeDiff > 200) {
        usbBufferRef.current = ''
      }

      if (e.key.length === 1) {
        usbBufferRef.current += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleValidate])

  // Gerenciamento da Câmera com Html5Qrcode
  const startCamera = async () => {
    setCameraError(null)
    setCameraActive(true)

    // Pequeno delay para garantir que o container DOM esteja visível e com dimensões calculadas
    await new Promise((resolve) => setTimeout(resolve, 50))

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-container')
      }
      const qrScanner = html5QrCodeRef.current

      // Tenta iniciar com câmera traseira primeiro (celular), ou câmera padrão (notebook)
      try {
        await qrScanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            handleValidate(decodedText)
          },
          () => {}
        )
      } catch {
        // Fallback para notebooks que possuem apenas câmera frontal
        const cameras = await Html5Qrcode.getCameras()
        if (cameras && cameras.length > 0) {
          await qrScanner.start(
            cameras[0].id,
            {
              fps: 10,
              qrbox: { width: 220, height: 220 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              handleValidate(decodedText)
            },
            () => {}
          )
        } else {
          throw new Error('Nenhuma câmera encontrada no dispositivo.')
        }
      }
    } catch (err) {
      setCameraActive(false)
      setCameraError(
        err instanceof Error
          ? err.message
          : 'Não foi possível acessar a câmera do dispositivo. Verifique as permissões do navegador.'
      )
    }
  }


  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop()
        }
      } catch {
        // Silencioso
      }
    }
    setCameraActive(false)
  }

  // Limpeza ao desmontar o componente
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(() => {})
        }
      }
    }
  }, [])

  const isAnonymousEvent = event.ticketLayout !== 'formal_pdf' && event.participantIdType === 'none'

  return (
    <div className="checkin-terminal-wrapper">

      <style>{`
        .checkin-terminal-wrapper {
          max-width: 960px;
          margin: 0 auto;
          padding: 1rem 0.5rem;
          display: grid;
          gap: 1rem;
          width: 100%;
          box-sizing: border-box;
          overflow-x: hidden;
        }
        .checkin-terminal-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 330px), 1fr));
          gap: 1rem;
          width: 100%;
          box-sizing: border-box;
        }
        .checkin-input-group {
          display: flex;
          gap: 0.5rem;
          width: 100%;
          box-sizing: border-box;
        }
        #qr-reader-container {
          border: none !important;
          background: transparent !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }
        #qr-reader-container video {
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          border-radius: 12px;
          object-fit: cover;
        }
        #qr-reader-container img {
          display: none !important;
        }
        #qr-reader-container canvas {
          max-width: 100% !important;
        }
        #qr-reader-container__scan_region {
          border-radius: 12px;
          max-width: 100% !important;
          overflow: hidden !important;
        }
        @media (max-width: 768px) {
          .checkin-terminal-wrapper {
            padding: 0.5rem 0.25rem;
            gap: 0.75rem;
          }
          .checkin-terminal-grid {
            grid-template-columns: 1fr !important;
            gap: 0.75rem !important;
          }
          .checkin-input-group {
            flex-direction: column !important;
          }
          .checkin-input-group button {
            width: 100% !important;
          }
          .checkin-header-card {
            padding: 1rem !important;
          }
          .checkin-main-card {
            padding: 1rem !important;
          }
        }
      `}</style>

      {/* ── BARRA SUPERIOR ── */}
      <header
        className="checkin-header-card"
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
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0, wordBreak: 'break-word' }}>
              {event.title}
            </h1>
            <span
              style={{
                background: '#e0e7ff',
                color: '#4338ca',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              📍 {access.name}
            </span>
            <span
              style={{
                background: event.checkinEnabled !== false ? '#dcfce7' : '#fee2e2',
                color: event.checkinEnabled !== false ? '#15803d' : '#b91c1c',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {event.checkinEnabled !== false ? '🟢 Portaria Aberta' : '🔴 Portaria Fechada'}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.82rem', wordBreak: 'break-word' }}>
            Credencial: <code style={{ fontWeight: 700, color: '#4f46e5' }}>{access.code}</code> • {event.location}
          </p>
        </div>

        {/* Contador e Botão Sair */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Presença
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: 'flex-end' }}>
              <strong style={{ fontSize: '1.2rem', color: '#15803d' }}>{checkedInCount}</strong>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>/ {totalTickets}</span>
              <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700, marginLeft: '2px' }}>
                ({attendanceRate}%)
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera()
              onLogout()
            }}
            style={{
              padding: '0.45rem 0.8rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#475569',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sair
          </button>
        </div>
      </header>

      {/* Banner de Portaria Fechada / Desativada */}
      {event.checkinEnabled === false && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            background: '#fef2f2',
            border: '2px solid #f87171',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 4px 6px -1px rgba(185, 28, 28, 0.1)',
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
          <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🚫</span>
          <div>
            <strong style={{ display: 'block', fontSize: '0.95rem' }}>
              Portaria Fechada pelo Administrador
            </strong>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#b91c1c', lineHeight: 1.4 }}>
              O check-in para este evento está pausado. Nenhuma validação de ingresso será autorizada até que a administração reabra a portaria.
            </p>
          </div>
        </div>
      )}

      {/* ── CARD PRINCIPAL: SCANNER & FEEDBACK ── */}
      <div className="checkin-terminal-grid">
        {/* Lado Esquerdo: Câmera e Entrada */}
        <div
          className="checkin-main-card"
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '1.25rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            display: 'grid',
            gap: '1rem',
            boxSizing: 'border-box',
            width: '100%',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Validação de Entrada
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Leitor USB / Teclado Pronto
            </span>
          </div>

          {/* Área da Câmera */}
          <div
            style={{
              position: 'relative',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#0f172a',
              minHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            {/* O container onde o Html5Qrcode renderiza o stream da câmera */}
            <div
              id="qr-reader-container"
              style={{
                width: '100%',
                maxWidth: '100%',
                display: cameraActive ? 'block' : 'none',
                boxSizing: 'border-box',
              }}
            />

            {/* Overlay de Câmera Pausada durante o feedback de 5s */}

            {cameraActive && result && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: result.valid ? 'rgba(22, 101, 52, 0.75)' : 'rgba(153, 27, 27, 0.75)',
                  backdropFilter: 'blur(3px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  zIndex: 10,
                  padding: '1rem',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>
                  {result.valid ? '✓' : '⏸️'}
                </span>
                <strong style={{ fontSize: '1rem' }}>
                  {result.valid ? 'Check-in Registrado!' : 'Aguarde um instante'}
                </strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#f1f5f9' }}>
                  Câmera pausada por 5 segundos...
                </p>
              </div>
            )}


            {!cameraActive && (
              <div style={{ textAlign: 'center', padding: '2rem 1.5rem', color: '#94a3b8' }}>
                <p style={{ fontSize: '2.5rem', margin: '0 0 0.5rem' }}>📷</p>
                <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
                  Aponte a câmera para o QR Code do ingresso.
                </p>
                <button
                  type="button"
                  disabled={event.checkinEnabled === false}
                  onClick={startCamera}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: event.checkinEnabled === false ? '#64748b' : '#4f46e5',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    cursor: event.checkinEnabled === false ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                  }}
                >
                  Ativar Câmera
                </button>
              </div>
            )}
          </div>

          {cameraActive && (
            <button
              type="button"
              onClick={stopCamera}
              style={{
                padding: '0.55rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#64748b',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Desativar Câmera
            </button>
          )}

          {cameraError && (
            <p style={{ margin: 0, color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>
              ⚠️ {cameraError}
            </p>
          )}


          {/* Validação por Digitação ou Scanner */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleValidate(manualCode)
            }}
            style={{ display: 'grid', gap: '0.5rem' }}
          >
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
              ⌨️ Ou Digite o Código (Código MP360-... ou UUID do QR Code):
            </label>
            <div className="checkin-input-group">
              <input
                type="text"
                disabled={event.checkinEnabled === false}
                placeholder="Ex: MP360-8A2F9C1E ou UUID"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  outline: 'none',
                  fontFamily: 'monospace',
                  background: event.checkinEnabled === false ? '#f1f5f9' : '#fff',
                  cursor: event.checkinEnabled === false ? 'not-allowed' : 'text',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                disabled={isValidating || !manualCode.trim() || event.checkinEnabled === false}
                style={{
                  padding: '0.65rem 1.1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: isValidating || !manualCode.trim() || event.checkinEnabled === false ? '#94a3b8' : '#0f172a',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: isValidating || !manualCode.trim() || event.checkinEnabled === false ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  boxSizing: 'border-box',
                }}
              >
                {isValidating ? 'Validando...' : 'Validar Entrada'}
              </button>
            </div>
          </form>

        </div>

        {/* Lado Direito: Feedback Visual em Destaque */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Card de Resultado */}
          {result ? (
            result.valid ? (
              // ✅ SUCESSO
              <div
                style={{
                  padding: '1.75rem',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  border: '2px solid #86efac',
                  boxShadow: '0 10px 25px -5px rgba(22, 101, 52, 0.15)',
                  display: 'grid',
                  gap: '1rem',
                  animation: 'ct-scale 0.2s ease-out',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: '#15803d',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#15803d', fontWeight: 800 }}>
                        Check-in Realizado com Sucesso
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: '#166534', fontWeight: 600 }}>
                        Entrada autorizada às {formatTime(result.checkedInAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    title="Fechar aviso"
                    style={{
                      border: 'none',
                      background: 'rgba(21, 128, 61, 0.1)',
                      color: '#15803d',
                      borderRadius: '8px',
                      width: '28px',
                      height: '28px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'grid',
                    gap: '0.6rem',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  {!isAnonymousEvent && result.participantName && (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                        Participante:
                      </span>
                      <p style={{ margin: '1px 0 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                        {result.participantName}
                      </p>
                    </div>
                  )}

                  {!isAnonymousEvent && result.participantCpf && (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                        CPF:
                      </span>
                      <p style={{ margin: '1px 0 0', fontSize: '0.95rem', fontWeight: 700, color: '#334155', fontFamily: 'monospace' }}>
                        {formatCpf(result.participantCpf)}
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Tipo:</span>
                      <strong style={{ display: 'block', fontSize: '0.9rem', color: '#0f172a' }}>
                        {result.ticketTypeName ?? 'Ingresso'}
                      </strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Código:</span>
                      <strong style={{ display: 'block', fontSize: '0.9rem', color: '#4f46e5', fontFamily: 'monospace' }}>
                        {result.publicCode}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // ❌ ERRO / ENTRADA INVÁLIDA
              <div
                style={{
                  padding: '1.75rem',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                  border: '2px solid #fca5a5',
                  boxShadow: '0 10px 25px -5px rgba(185, 28, 28, 0.15)',
                  display: 'grid',
                  gap: '1rem',
                  animation: 'ct-scale 0.2s ease-out',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: '#dc2626',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      ✕
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#b91c1c', fontWeight: 800 }}>
                        Entrada Não Permitida
                      </h3>
                      <p style={{ margin: '2px 0 0', fontSize: '0.95rem', color: '#991b1b', fontWeight: 700 }}>
                        {result.reason}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    title="Fechar aviso"
                    style={{
                      border: 'none',
                      background: 'rgba(220, 38, 38, 0.1)',
                      color: '#dc2626',
                      borderRadius: '8px',
                      width: '28px',
                      height: '28px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>


                {result.firstCheckedInAt && (
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.85)',
                      borderRadius: '12px',
                      padding: '0.85rem 1rem',
                      border: '1px solid #fecaca',
                      fontSize: '0.85rem',
                      color: '#7f1d1d',
                    }}
                  >
                    <strong>Detalhes da 1ª Entrada:</strong>
                    <p style={{ margin: '3px 0 0' }}>
                      🕒 Realizado em: {formatTime(result.firstCheckedInAt)}
                      {result.firstCheckedInBy ? ` • Por: ${result.firstCheckedInBy}` : ''}
                    </p>
                  </div>
                )}
              </div>
            )
          ) : (
            // Aguardando primeiro scan
            <div
              style={{
                padding: '2.5rem 1.5rem',
                borderRadius: '16px',
                background: '#f8fafc',
                border: '2px dashed #cbd5e1',
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>🎟️</span>
              <strong style={{ fontSize: '1.1rem', color: '#334155', display: 'block' }}>
                Aguardando leitura de QR Code...
              </strong>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                Use a câmera, o leitor USB ou digite o código acima para validar o participante.
              </p>
            </div>
          )}

          {/* Histórico Recente de Entradas */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '1.25rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
            }}
          >
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: '#0f172a', fontWeight: 700 }}>
              Últimas Entradas Registradas
            </h3>

            {recentEntries.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                Nenhuma entrada registrada nesta sessão ainda.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {recentEntries.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem 0.75rem',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                    }}
                  >
                    <div>
                      <strong style={{ color: '#0f172a' }}>
                        {entry.participantName ?? entry.publicCode}
                      </strong>
                      <span style={{ color: '#64748b', marginLeft: '6px' }}>
                        ({entry.ticketTypeName})
                      </span>
                    </div>
                    <span style={{ color: '#15803d', fontWeight: 600 }}>
                      {formatTime(entry.checkedInAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ct-scale {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

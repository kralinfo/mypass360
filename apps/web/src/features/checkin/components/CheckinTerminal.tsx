'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import type {
  CheckinAuthResponse,
  CheckinRecord,
  CheckinValidationResult,
} from '@mypass360/types'
import { fetchRecentCheckins, validateCheckinTicket, fetchCheckinStatus } from '../checkin.service'

interface CheckinTerminalProps {
  authData: CheckinAuthResponse
  onLogout: () => void
}

// ── Estados explícitos da portaria ──────────────────────────────────────────
type TerminalState =
  | 'PORTARIA_FECHADA'
  | 'AGUARDANDO_LEITURA'
  | 'PROCESSANDO_LEITURA'
  | 'CHECKIN_REALIZADO'
  | 'CHECKIN_INVALIDO'
  | 'TODOS_CHECKINS_REALIZADOS'

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
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

export function CheckinTerminal({ authData, onLogout }: CheckinTerminalProps) {
  const { access, event } = authData

  const [manualCode, setManualCode] = useState('')
  const [result, setResult] = useState<CheckinValidationResult | null>(null)
  const [recentEntries, setRecentEntries] = useState<CheckinRecord[]>([])
  const [checkinSearch, setCheckinSearch] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Estado explícito da portaria (REQ-24/25/26)
  const [terminalState, setTerminalState] = useState<TerminalState>(
    event.checkinEnabled === true ? 'AGUARDANDO_LEITURA' : 'PORTARIA_FECHADA'
  )

  // Contadores ao vivo — iniciados com os valores do authData
  const [checkedInCount, setCheckedInCount] = useState(event.checkedInTickets)
  const totalTickets = event.totalTickets
  const attendanceRate = totalTickets > 0 ? Math.round((checkedInCount / totalTickets) * 100) : 0

  // Detectar se todos os check-ins já estavam completos ao abrir o terminal
  // Só considera se a portaria estiver aberta (não faz sentido mostrar se fechada)
  const [allCheckedInOnLoad] = useState(
    event.checkinEnabled === true &&
    event.totalTickets > 0 &&
    event.checkedInTickets >= event.totalTickets
  )

  // Ref para evitar múltiplos loops de polling simultâneos
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const lastScannedCodeRef = useRef<string | null>(null)
  const scanThrottleRef = useRef<number>(0)
  const usbBufferRef = useRef<string>('')
  const usbLastKeyTimeRef = useRef<number>(0)
  const cameraEnabledRef = useRef<boolean>(false)

  // Controla se o scanner está processando (evita duplo scan)
  const isProcessingRef = useRef(false)

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

  // Se a portaria estava aberta e todos os check-ins já estavam completos ao iniciar
  useEffect(() => {
    if (event.checkinEnabled === true && allCheckedInOnLoad) {
      setTerminalState('TODOS_CHECKINS_REALIZADOS')
    }
  }, [event.checkinEnabled, allCheckedInOnLoad])

  // ── Polling periódico para detectar exclusão de check-in pelo admin ─────────
  // Quando todos os check-ins estão realizados, verifica a cada 30s se algum
  // foi removido. Se sim, reativa o terminal automaticamente.
  useEffect(() => {
    if (terminalState !== 'TODOS_CHECKINS_REALIZADOS') {
      // Limpa o polling quando não está neste estado
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      return
    }

    const checkStatus = async () => {
      try {
        const status = await fetchCheckinStatus(access.code)
        if (status.checkedInTickets < status.totalTickets) {
          setCheckedInCount(status.checkedInTickets)
          setResult(null)
          setManualCode('')
          lastScannedCodeRef.current = null
          setTerminalState('AGUARDANDO_LEITURA')
        } else {
          setCheckedInCount(status.checkedInTickets)
        }
      } catch {
        // Silencioso — não interrompe o fluxo em caso de erro de rede
      }
    }

    pollingIntervalRef.current = setInterval(checkStatus, 30_000)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [terminalState, access.code])

  // ── Gerenciamento da Câmera ─────────────────────────────────────────────────

  const stopCamera = useCallback(async () => {
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
  }, [])

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

  // ── Função central de validação ─────────────────────────────────────────────
  const handleValidate = useCallback(
    async (codeToValidate: string) => {
      const trimmed = codeToValidate.trim()
      if (!trimmed || isProcessingRef.current) return

      // Portaria fechada — rejeita silenciosamente (o UI já impede, mas garantia extra)
      if (terminalState === 'PORTARIA_FECHADA') return

      // Evita duplo scan acidental no mesmo segundo
      const now = Date.now()
      if (lastScannedCodeRef.current === trimmed && now - scanThrottleRef.current < 2500) {
        return
      }

      lastScannedCodeRef.current = trimmed
      scanThrottleRef.current = now
      isProcessingRef.current = true

      // Para a câmera imediatamente ao iniciar processamento (REQ-25)
      await stopCamera()

      setTerminalState('PROCESSANDO_LEITURA')

      try {
        const res = await validateCheckinTicket(trimmed, access.code)
        setResult(res)

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(res.valid ? 200 : [100, 50, 100, 50, 100])
          } catch {
            // Silencioso
          }
        }

        if (res.valid) {
          setCheckedInCount((c) => c + 1)
          setManualCode('')
          loadRecent()

          // Mantém o estado CHECKIN_REALIZADO para que o operador visualize os dados do participante (REQ-26/UI)
          setTerminalState('CHECKIN_REALIZADO')
        } else {
          setTerminalState('CHECKIN_INVALIDO')
        }
      } catch (err) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate([100, 50, 100, 50, 100])
          } catch {
            // Silencioso
          }
        }
        setResult({
          valid: false,
          reason: err instanceof Error ? err.message : 'Erro na comunicação com o servidor.',
        })
        setTerminalState('CHECKIN_INVALIDO')
      } finally {
        isProcessingRef.current = false
      }
    },
    [access.code, terminalState, loadRecent, stopCamera]
  )

  // ── Iniciar câmera ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    // Marca que a câmera foi ativada pelo operador
    cameraEnabledRef.current = true

    // Garante encerramento de eventual scanner anterior
    await stopCamera()

    setCameraError(null)
    setCameraActive(true)

    // Pequeno delay para garantir que o container DOM esteja visível
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
  }, [handleValidate, stopCamera])

  // ── Concluir check-in ou Nova leitura (REQ-25 / REQ-26) ───────────────────
  const handleNovaLeitura = useCallback(async () => {
    // Garante que o scanner anterior foi encerrado antes de iniciar outro
    await stopCamera()
    setResult(null)
    setManualCode('')
    lastScannedCodeRef.current = null

    if (totalTickets > 0 && checkedInCount >= totalTickets) {
      cameraEnabledRef.current = false
      setTerminalState('TODOS_CHECKINS_REALIZADOS')
    } else {
      setTerminalState('AGUARDANDO_LEITURA')
      // Se a câmera já estava ativada pelo operador, reativa automaticamente sem exigir clique manual
      if (cameraEnabledRef.current) {
        setTimeout(() => {
          void startCamera()
        }, 60)
      }
    }
  }, [stopCamera, totalTickets, checkedInCount, startCamera])

  const handleConcluirCheckin = useCallback(async () => {
    cameraEnabledRef.current = false
    await stopCamera()
    setResult(null)
    setManualCode('')
    lastScannedCodeRef.current = null
    setTerminalState('TODOS_CHECKINS_REALIZADOS')
  }, [stopCamera])

  // ── Listener para leitor físico USB / Bluetooth ─────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Se o foco já está num input específico, deixa o comportamento normal
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      // Portaria fechada ou processando — ignora
      if (terminalState === 'PORTARIA_FECHADA' || terminalState === 'PROCESSANDO_LEITURA') {
        return
      }

      // Se já tem resultado, aguarda "Nova leitura" — não processa novos scans do USB
      if (terminalState === 'CHECKIN_REALIZADO' ||
          terminalState === 'CHECKIN_INVALIDO' ||
          terminalState === 'TODOS_CHECKINS_REALIZADOS') {
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
  }, [handleValidate, terminalState])

  const isPortariaFechada = terminalState === 'PORTARIA_FECHADA'
  const isProcessing = terminalState === 'PROCESSANDO_LEITURA'
  const hasResult = result !== null
  const isAnonymousEvent = event.ticketLayout !== 'formal_pdf' && event.participantIdType === 'none'
  const allCheckedInNow = terminalState === 'TODOS_CHECKINS_REALIZADOS'

  return (
    <div className="checkin-terminal-wrapper">

      <style>{`
        .checkin-terminal-wrapper {
          max-width: 960px;
          margin: 0 auto;
          padding: 0.5rem 0.35rem;
          display: grid;
          gap: 0.5rem;
          width: 100%;
          box-sizing: border-box;
          overflow-x: hidden;
        }
        .checkin-terminal-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
          gap: 0.5rem;
          width: 100%;
          box-sizing: border-box;
        }
        .checkin-input-group {
          display: flex;
          gap: 0.4rem;
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
          height: 100% !important;
          max-height: none !important;
          border-radius: 12px;
          object-fit: cover !important;
        }
        #qr-reader-container img {
          display: none !important;
        }
        #qr-reader-container canvas {
          max-width: 100% !important;
        }
        #qr-reader-container__scan_region {
          border-radius: 10px;
          max-width: 100% !important;
          overflow: hidden !important;
        }
        @media (max-width: 768px) {
          .checkin-terminal-wrapper {
            padding: 0rem 0.1rem 0.25rem;
            gap: 0.35rem;
          }
          .checkin-terminal-grid {
            grid-template-columns: 1fr !important;
            gap: 0.35rem !important;
          }
          .checkin-header-card {
            padding: 0.4rem 0.65rem !important;
            border-radius: 10px !important;
          }
          .checkin-main-card {
            padding: 0.65rem 0.75rem !important;
            border-radius: 12px !important;
            gap: 0.5rem !important;
          }
        }
      `}</style>

      {/* ── BARRA SUPERIOR HIPER COMPACTA EM 2 LINHAS LIMPAS ── */}
      <header
        className="checkin-header-card"
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '0.55rem 0.85rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          boxSizing: 'border-box',
          width: '100%',
          minWidth: 0,
        }}
      >
        {/* Linha 1: Título do Evento + Botão Sair */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', width: '100%', minWidth: 0 }}>
          <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2, flex: 1, minWidth: 0 }}>
            {event.title}
          </h1>
          <button
            onClick={() => {
              stopCamera()
              onLogout()
            }}
            style={{
              padding: '0.25rem 0.55rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#475569',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Sair
          </button>
        </div>

        {/* Linha 2: Badges (Status, Portaria) + Contador de Presença */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', width: '100%', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', minWidth: 0 }}>
            <span
              style={{
                background: isPortariaFechada ? '#fee2e2' : '#dcfce7',
                color: isPortariaFechada ? '#b91c1c' : '#15803d',
                padding: '1px 7px',
                borderRadius: '999px',
                fontSize: '0.7rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {isPortariaFechada ? '🔴 Fechada' : '🟢 Aberta'}
            </span>
            <span
              style={{
                background: '#e0e7ff',
                color: '#4338ca',
                padding: '1px 7px',
                borderRadius: '999px',
                fontSize: '0.7rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {access.name}
            </span>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginRight: '3px' }}>
              PRESENÇA:
            </span>
            <strong style={{ fontSize: '0.95rem', color: '#15803d' }}>{checkedInCount}</strong>
            <span>/{totalTickets}</span>
            <span style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 700, marginLeft: '2px' }}>
              ({attendanceRate}%)
            </span>
          </div>
        </div>
      </header>

      {/* Banner de Portaria Fechada (REQ-24) */}
      {isPortariaFechada && (
        <div
          style={{
            padding: '0.65rem 0.85rem',
            borderRadius: '10px',
            background: '#fef2f2',
            border: '1.5px solid #f87171',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxSizing: 'border-box',
            width: '100%',
          }}
        >
          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🚫</span>
          <div>
            <strong style={{ display: 'block', fontSize: '0.85rem' }}>
              Portaria Fechada
            </strong>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#b91c1c', lineHeight: 1.3 }}>
              O check-in está pausado. O organizador deve abrir a portaria em <strong>Gerenciar → Portaria</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Banner permanente "Todos os check-ins realizados" (REQ-26) */}
      {allCheckedInNow && (
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderRadius: '12px',
            background: '#ffffff',
            border: '1.5px solid #4ade80',
            color: '#15803d',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            boxSizing: 'border-box',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 2px 12px rgba(21, 128, 61, 0.10)',
          }}
        >
          <strong style={{ display: 'block', fontSize: '1.05rem', fontWeight: 700, color: '#15803d' }}>
            Todos os Check-ins Realizados
          </strong>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#4b7c5e', lineHeight: 1.5 }}>
            Todos os {totalTickets} ingresso{totalTickets !== 1 ? 's' : ''} foram validados.
            O terminal está bloqueado.
          </p>
          <span
            style={{
              marginTop: '0.25rem',
              fontSize: '0.72rem',
              color: '#22c55e',
              fontWeight: 500,
            }}
          >
            Verificando automaticamente a cada 30s por alterações
          </span>
        </div>
      )}

      {/* ── CARD PRINCIPAL: SCANNER & RESULTADO — oculto quando todos os check-ins foram realizados ── */}
      {!allCheckedInNow && <div className="checkin-terminal-grid">
        <div
          className="checkin-main-card"
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '0.85rem',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
            display: 'grid',
            gap: '0.65rem',
            boxSizing: 'border-box',
            width: '100%',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Validação de Entrada
            </h2>
            {!isPortariaFechada && (
              <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                Leitor USB / Teclado
              </span>
            )}
          </div>

          {/* ── CARD DE RESULTADO / FEEDBACK (RENDERIZADO NO TOPO QUANDO HOUVER VALIDAÇÃO) ── */}
          {result && (
            result.valid ? (
              // ✅ SUCESSO - Card Ultra Destaque no Topo
              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  border: '2px solid #86efac',
                  boxShadow: '0 4px 12px rgba(22, 101, 52, 0.12)',
                  display: 'grid',
                  gap: '0.65rem',
                  animation: 'ct-scale 0.2s ease-out',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#15803d',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#15803d', fontWeight: 800, lineHeight: 1.2 }}>
                      Check-in Realizado com Sucesso
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>
                      Entrada autorizada às {formatTime(result.checkedInAt)}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '10px',
                    padding: '0.6rem 0.8rem',
                    display: 'grid',
                    gap: '0.35rem',
                    border: '1px solid #bbf7d0',
                  }}
                >
                  {!isAnonymousEvent && result.participantName && (
                    <div>
                      <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                        Participante:
                      </span>
                      <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                        {result.participantName}
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid #e2e8f0', paddingTop: '0.35rem', marginTop: '0.15rem' }}>
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Tipo: </span>
                      <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>
                        {result.ticketTypeName ?? 'Ingresso'}
                      </strong>
                    </div>
                    {!isAnonymousEvent && result.participantCpf && (
                      <div>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>CPF: </span>
                        <strong style={{ fontSize: '0.82rem', color: '#334155', fontFamily: 'monospace' }}>
                          {formatCpf(result.participantCpf)}
                        </strong>
                      </div>
                    )}
                    <div>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>Código: </span>
                      <strong style={{ fontSize: '0.82rem', color: '#4f46e5', fontFamily: 'monospace' }}>
                        {result.publicCode}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Botão "Nova leitura" ou "Concluir check-in" CENTRALIZADO ABAIXO do card do participante */}
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '0.1rem' }}>
                  {(() => {
                    const isLastCheckin = Boolean(
                      result.allCheckedIn || (totalTickets > 0 && checkedInCount >= totalTickets)
                    )
                    return (
                      <button
                        type="button"
                        onClick={isLastCheckin ? handleConcluirCheckin : handleNovaLeitura}
                        style={{
                          padding: '0.5rem 1.25rem',
                          borderRadius: '8px',
                          border: 'none',
                          background: isLastCheckin ? '#16a34a' : '#4f46e5',
                          color: '#fff',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          boxShadow: isLastCheckin
                            ? '0 2px 8px rgba(22, 163, 74, 0.35)'
                            : '0 2px 8px rgba(79, 70, 229, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                        }}
                      >
                        {isLastCheckin ? 'Concluir check-in' : '📷 Nova leitura'}
                      </button>
                    )
                  })()}
                </div>
              </div>
            ) : (
              // ❌ ERRO - Card Ultra Destaque no Topo
              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                  border: '2px solid #fca5a5',
                  boxShadow: '0 4px 12px rgba(185, 28, 28, 0.12)',
                  display: 'grid',
                  gap: '0.65rem',
                  animation: 'ct-scale 0.2s ease-out',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#dc2626',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#b91c1c', fontWeight: 800, lineHeight: 1.2 }}>
                      Entrada Não Permitida
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#991b1b', fontWeight: 700 }}>
                      {result.reason}
                    </p>
                  </div>
                </div>

                {result.firstCheckedInAt && (
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '10px',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #fecaca',
                      fontSize: '0.78rem',
                      color: '#7f1d1d',
                    }}
                  >
                    <strong>Detalhes da 1ª Entrada:</strong> 🕒 {formatTime(result.firstCheckedInAt)}
                    {result.firstCheckedInBy ? ` • Por: ${result.firstCheckedInBy}` : ''}
                  </div>
                )}

                {/* Botão "Nova leitura" CENTRALIZADO ABAIXO */}
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '0.1rem' }}>
                  <button
                    type="button"
                    onClick={handleNovaLeitura}
                    style={{
                      padding: '0.5rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#dc2626',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    📷 Nova leitura
                  </button>
                </div>
              </div>
            )
          )}

          {/* Área da Câmera (Oculta quando há resultado de validação ativo) */}
          {!hasResult && (
            <div
              style={{
                position: 'relative',
                borderRadius: '14px',
                overflow: 'hidden',
                background: '#0f172a',
                width: '100%',
                maxWidth: '210px',
                aspectRatio: '1 / 1',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
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

              {/* Placeholder quando câmera não está ativa */}
              {!cameraActive && (
                <div style={{ textAlign: 'center', padding: '0.85rem 0.5rem', color: '#94a3b8' }}>
                  {isProcessing ? (
                    <>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          border: '3px solid rgba(255,255,255,0.15)',
                          borderTopColor: '#4f46e5',
                          animation: 'ct-spin 0.7s linear infinite',
                          margin: '0 auto 0.5rem',
                        }}
                      />
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>
                        Validando ingresso...
                      </p>
                    </>
                  ) : (
                    <>
                      <p style={{ fontSize: '1.6rem', margin: '0 0 0.25rem' }}>📷</p>
                      <p style={{ margin: '0 0 0.65rem', fontSize: '0.82rem', color: '#cbd5e1' }}>
                        {isPortariaFechada
                          ? 'Portaria fechada.'
                          : 'Aponte a câmera para o QR Code.'}
                      </p>
                      {!isPortariaFechada && (
                        <button
                          type="button"
                          onClick={startCamera}
                          style={{
                            padding: '0.45rem 1.1rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#4f46e5',
                            color: '#fff',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                          }}
                        >
                          Ativar Câmera
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {cameraActive && !hasResult && (
            <button
              type="button"
              onClick={() => {
                cameraEnabledRef.current = false
                void stopCamera()
              }}
              style={{
                padding: '0.45rem',
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#64748b',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Desativar Câmera
            </button>
          )}

          {cameraError && (
            <p style={{ margin: 0, color: '#dc2626', fontSize: '0.78rem', fontWeight: 600 }}>
              ⚠️ {cameraError}
            </p>
          )}

          {/* Validação por Digitação ou Scanner */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleValidate(manualCode)
            }}
            style={{ display: 'grid', gap: '0.35rem' }}
          >
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
              ⌨️ Ou Digite o Código (MP360-... ou UUID):
            </label>
            <div className="checkin-input-group">
              <input
                type="text"
                disabled={isPortariaFechada || isProcessing || hasResult}
                placeholder="Ex: MP360-... ou UUID"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  width: '100%',
                  padding: '0.45rem 0.55rem',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  outline: 'none',
                  fontFamily: 'monospace',
                  background: isPortariaFechada || isProcessing || hasResult ? '#f1f5f9' : '#fff',
                  cursor: isPortariaFechada || isProcessing || hasResult ? 'not-allowed' : 'text',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                disabled={isProcessing || !manualCode.trim() || isPortariaFechada || hasResult}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '7px',
                  border: 'none',
                  background: isProcessing || !manualCode.trim() || isPortariaFechada || hasResult ? '#94a3b8' : '#0f172a',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: isProcessing || !manualCode.trim() || isPortariaFechada || hasResult ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  boxSizing: 'border-box',
                  flexShrink: 0,
                }}
              >
                {isProcessing ? 'Validando...' : 'Validar'}
              </button>
            </div>
          </form>
        </div>

      </div>}

      {/* Histórico de Entradas — sempre visível */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '0.85rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
          display: 'grid',
          gap: '0.65rem',
        }}
      >
        {/* Cabeçalho + Barra de Pesquisa */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }}>
            Entradas Registradas
            {recentEntries.length > 0 && (
              <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                ({recentEntries.length})
              </span>
            )}
          </h3>
          {recentEntries.length > 0 && (
            <div style={{ position: 'relative', flex: '1 1 160px', maxWidth: 260 }}>
              <span
                style={{
                  position: 'absolute',
                  left: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  fontSize: '0.8rem',
                  pointerEvents: 'none',
                }}
              >
                🔍
              </span>
              <input
                type="text"
                placeholder="Buscar por nome ou código..."
                value={checkinSearch}
                onChange={(e) => setCheckinSearch(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: '1.8rem',
                  paddingRight: '0.6rem',
                  paddingTop: '0.35rem',
                  paddingBottom: '0.35rem',
                  borderRadius: '7px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.75rem',
                  color: '#0f172a',
                  background: '#f8fafc',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#4ade80'; e.currentTarget.style.background = '#fff'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
              />
            </div>
          )}
        </div>

        {/* Lista */}
        {recentEntries.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
            Nenhuma entrada registrada nesta sessão ainda.
          </p>
        ) : (() => {
          const q = checkinSearch.toLowerCase().trim()
          const filtered = q
            ? recentEntries.filter(
                (e) =>
                  e.participantName?.toLowerCase().includes(q) ||
                  e.publicCode.toLowerCase().includes(q)
              )
            : recentEntries

          if (filtered.length === 0) {
            return (
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                Nenhum resultado para &quot;{checkinSearch}&quot;.
              </p>
            )
          }

          return (
            <div style={{ display: 'grid', gap: '0.3rem', maxHeight: '260px', overflowY: 'auto' }}>
              {filtered.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    alignItems: 'stretch',
                    gap: '0.5rem',
                    padding: '0.45rem 0.65rem',
                    background: '#f8fafc',
                    borderRadius: '7px',
                    fontSize: '0.78rem',
                    minWidth: 0,
                    borderLeft: '3px solid #4ade80',
                  }}
                >
                  {/* Coluna esquerda: nome + tipo */}
                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <strong style={{ color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                      {entry.participantName ?? '—'}
                    </strong>
                    <span style={{ fontSize: '0.70rem', color: '#64748b' }}>{entry.ticketTypeName}</span>
                  </div>

                  {/* Coluna direita: código (cima) + horário (baixo) */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.2rem' }}>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        background: '#f0fdf4',
                        color: '#15803d',
                        border: '1px solid #bbf7d0',
                        borderRadius: '4px',
                        padding: '0 0.35rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.publicCode}
                    </span>
                    <span style={{ color: '#94a3b8', fontWeight: 500, whiteSpace: 'nowrap', fontSize: '0.72rem' }}>
                      {formatTime(entry.checkedInAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </div>
    </div>
  )
}


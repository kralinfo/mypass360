'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Event, Ticket } from '@mypass360/types'
import { validateAccessPassword, registerFreeAttendance } from '../services/free-registration.service'

interface FreeRegistrationModalProps {
  event: Event
  isOpen: boolean
  onClose: () => void
  onSuccess?: (ticket: Ticket) => void
}

export function FreeRegistrationModal({
  event,
  isOpen,
  onClose,
  onSuccess,
}: FreeRegistrationModalProps) {
  const router = useRouter()

  const [step, setStep] = useState<'password' | 'form' | 'success'>(
    event.has_password ? 'password' : 'form'
  )

  const [accessPassword, setAccessPassword] = useState('')
  const [registrationToken, setRegistrationToken] = useState<string | undefined>(undefined)

  const [participantName, setParticipantName] = useState('')
  const [participantCpf, setParticipantCpf] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issuedTicket, setIssuedTicket] = useState<Ticket | null>(null)

  // Resetar estado completo sempre que o modal for aberto/fechado
  useEffect(() => {
    if (isOpen) {
      setStep(event.has_password ? 'password' : 'form')
      setAccessPassword('')
      setRegistrationToken(undefined)
      setParticipantName('')
      setParticipantCpf('')
      setError(null)
      setIssuedTicket(null)
      setLoading(false)
    }
  }, [isOpen, event.has_password])

  if (!isOpen) return null

  // 1. Validar Senha de Acesso
  const handleValidatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessPassword.trim()) return

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push(`/login?next=/eventos/${event.slug}`)
        return
      }

      const response = await validateAccessPassword(event.id, session.access_token, {
        access_password: accessPassword.trim(),
      })

      if (response.valid) {
        setRegistrationToken(response.registration_token)
        // Pré-preencher nome do usuário se disponível no metadata
        setParticipantName(session.user.user_metadata?.name || session.user.email || '')
        setParticipantCpf(session.user.user_metadata?.cpf || '')
        setStep('form')
      } else {
        setError(response.message || 'Senha de acesso incorreta.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao validar senha.')
    } finally {
      setLoading(false)
    }
  }

  // 2. Confirmar Presença
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push(`/login?next=/eventos/${event.slug}`)
        return
      }

      const ticket = await registerFreeAttendance(event.id, session.access_token, {
        participant_name: participantName.trim() || undefined,
        participant_cpf: participantCpf.trim() || undefined,
        registration_token: registrationToken,
      })

      setIssuedTicket(ticket)
      setStep('success')
      if (onSuccess) onSuccess(ticket)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao confirmar presença.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            fontSize: '1.1rem',
          }}
        >
          ✕
        </button>

        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: '12px',
              fontSize: '0.9rem',
              fontWeight: 500,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* PASSO 1: SENHA DE ACESSO */}
        {step === 'password' && (
          <form onSubmit={(e) => void handleValidatePassword(e)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🔒</span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Evento Restrito com Senha
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.35rem' }}>
                Este evento gratuito exige uma senha de acesso definida pelo organizador para confirmar presença.
              </p>
            </div>

            <div>
              <label htmlFor="access_password" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                Senha de Acesso
              </label>
              <input
                type="password"
                id="access_password"
                value={accessPassword}
                onChange={(e) => setAccessPassword(e.target.value)}
                placeholder="Digite a senha fornecida pelo organizador"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '1rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !accessPassword.trim()}
              style={{
                width: '100%',
                padding: '0.85rem',
                borderRadius: '12px',
                background: loading ? '#94a3b8' : '#0284c7',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '1rem',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Verificando...' : 'Avançar'}
            </button>
          </form>
        )}

        {/* PASSO 2: CONFIRMAÇÃO DE DADOS */}
        {step === 'form' && (
          <form onSubmit={(e) => void handleRegister(e)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🎟️</span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Confirmar Presença Gratuita
              </h2>

            </div>

            <div>
              <label htmlFor="participant_name" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                Nome do Participante *
              </label>
              <input
                type="text"
                id="participant_name"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Seu nome completo"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label htmlFor="participant_cpf" style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                CPF (Opcional)
              </label>
              <input
                type="text"
                id="participant_cpf"
                value={participantCpf}
                onChange={(e) => setParticipantCpf(e.target.value)}
                placeholder="000.000.000-00"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !participantName.trim()}
              style={{
                width: '100%',
                padding: '0.9rem',
                borderRadius: '12px',
                background: loading ? '#94a3b8' : '#16a34a',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1.05rem',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
              }}
            >
              {loading ? 'Confirmando...' : 'Garantir Minha Vaga Gratuitamente'}
            </button>
          </form>
        )}

        {/* PASSO 3: SUCESSO / TICKET GERADO */}
        {step === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 'bold',
              }}
            >
              ✓
            </div>

            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Presença Confirmada!
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.35rem' }}>
                Seu ingresso gratuito foi emitido e já está disponível em &quot;Meus Ingressos&quot;.
              </p>
            </div>

            {issuedTicket && (
              <div
                style={{
                  width: '100%',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '0.25rem 0.75rem', borderRadius: '20px' }}>
                  CÓDIGO: {issuedTicket.publicCode}
                </div>

                {issuedTicket.qrCode && (
                  <div style={{ background: '#ffffff', padding: '0.5rem', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <Image src={issuedTicket.qrCode} alt="QR Code Ingresso" width={160} height={160} style={{ display: 'block' }} />
                  </div>
                )}

                <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                  <strong>Titular:</strong> {issuedTicket.buyerName || 'Participante'}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
              <button
                onClick={() => {
                  onClose()
                  router.push('/meus-ingressos')
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: '#0f172a',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Ver Meus Ingressos
              </button>

              <button
                onClick={onClose}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Concluir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

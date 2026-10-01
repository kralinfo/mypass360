'use client'

import React, { useEffect, useState } from 'react'
import { getOrganizerBankAccount, saveOrganizerBankAccount, BANK_NAME_MAP } from '../services/bank-account.service'
import { OrganizerFinancialGuide } from './OrganizerFinancialGuide'

// ─── Utilitários de máscara e validação ──────────────────────────────────────
function maskCPF(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`
}

function maskCNPJ(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12,14)}`
}

function validateCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i)
  let r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  if (r !== parseInt(d[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i)
  r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  return r === parseInt(d[10])
}

function validateCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, '')
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false
  const calc = (d: string, weights: number[]) =>
    weights.reduce((acc, w, i) => acc + parseInt(d[i]) * w, 0)
  const mod = (n: number) => { const r = n % 11; return r < 2 ? 0 : 11 - r }
  const w1 = [5,4,3,2,9,8,7,6,5,4,3,2]
  const w2 = [6,5,4,3,2,9,8,7,6,5,4,3,2]
  if (mod(calc(d, w1)) !== parseInt(d[12])) return false
  return mod(calc(d, w2)) === parseInt(d[13])
}
// ─────────────────────────────────────────────────────────────────────────────

interface BankAccountSetupModalProps {
  isOpen: boolean
  onClose: () => void
  eventId?: string
  onSaved?: () => void
}

export function BankAccountSetupModal({ isOpen, onClose, eventId, onSaved }: BankAccountSetupModalProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'guide'>('form')
  const [holderName, setHolderName] = useState('')
  const [bankCode, setBankCode] = useState('001')
  const [customBankName, setCustomBankName] = useState('')
  const [personType, setPersonType] = useState<'pf' | 'pj'>('pf')
  const [document, setDocument] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [confirmPixKey, setConfirmPixKey] = useState('')
  const [contactPhone, setContactPhone] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [documentError, setDocumentError] = useState<string | null>(null)

  // Carregar dados PIX existentes ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      setIsSaved(false)
      setErrorMessage(null)
      setIsLoading(true)
      getOrganizerBankAccount()
        .then((savedAccount) => {
          if (savedAccount) {
            setHolderName(savedAccount.holder_name || '')
            setBankCode(savedAccount.bank_code || '001')
            setCustomBankName(savedAccount.bank_code === '999' ? (savedAccount.bank_name !== 'Outro Banco' ? savedAccount.bank_name : '') : '')
            setPersonType(savedAccount.person_type || 'pf')
            setDocument(savedAccount.document || '')
            setPixKey(savedAccount.pix_key || '')
            setConfirmPixKey(savedAccount.pix_key || '')
            setContactPhone(savedAccount.contact_phone || '')
          }
        })
        .catch((err) => {
          console.warn('Erro ao buscar conta bancária salva:', err)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleDocumentChange = (raw: string) => {
    const masked = personType === 'pf' ? maskCPF(raw) : maskCNPJ(raw)
    setDocument(masked)
    const digits = masked.replace(/\D/g, '')
    if (personType === 'pf') {
      if (digits.length === 11) {
        setDocumentError(validateCPF(digits) ? null : 'CPF inválido. Verifique os dígitos.')
      } else {
        setDocumentError(null)
      }
    } else {
      if (digits.length === 14) {
        setDocumentError(validateCNPJ(digits) ? null : 'CNPJ inválido. Verifique os dígitos.')
      } else {
        setDocumentError(null)
      }
    }
  }

  const isDocumentComplete = () => {
    const digits = document.replace(/\D/g, '')
    return personType === 'pf' ? digits.length === 11 : digits.length === 14
  }

  const isDocumentValid = () => {
    if (!isDocumentComplete()) return false
    const digits = document.replace(/\D/g, '')
    return personType === 'pf' ? validateCPF(digits) : validateCNPJ(digits)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    if (pixKey.trim() !== confirmPixKey.trim()) {
      setErrorMessage('⚠️ A Chave PIX e a Confirmação da Chave PIX não coincidem. Verifique e tente novamente.')
      setIsSubmitting(false)
      return
    }

    if (document && !isDocumentValid()) {
      setErrorMessage('⚠️ O CPF ou CNPJ informado é inválido. Verifique e tente novamente.')
      setIsSubmitting(false)
      return
    }

    try {
      await saveOrganizerBankAccount(
        {
          holder_name: holderName.trim(),
          bank_code: bankCode,
          bank_name: bankCode === '999' ? (customBankName.trim() || 'Outro Banco') : (BANK_NAME_MAP[bankCode] || 'Outro Banco'),
          pix_key: pixKey.trim(),
          contact_phone: contactPhone.trim(),
          person_type: personType,
          document: document.trim(),
          account_type: 'corrente',
          agency: '',
          account_number: '',
          account_digit: '',
        },
        eventId
      )

      setIsSaved(true)
      if (onSaved) onSaved()
    } catch (err) {
      console.error('Erro ao salvar conta PIX:', err)
      setErrorMessage('Ocorreu um erro ao salvar os dados para repasse via PIX. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Executivo */}
        <div
          style={{
            background: 'linear-gradient(135deg, #070a13 0%, #0f172a 100%)',
            color: '#ffffff',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Dados da Conta para Repasse via PIX
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
                Cadastre a Chave PIX da sua conta para receber o valor apurado do seu evento
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#cbd5e1',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.95rem',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#334155'
              e.currentTarget.style.color = '#ffffff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1e293b'
              e.currentTarget.style.color = '#cbd5e1'
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Sub-Header Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.65rem 1.5rem',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <button
            onClick={() => setActiveTab('form')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              border: activeTab === 'form' ? '1px solid #0f172a' : '1px solid transparent',
              background: activeTab === 'form' ? '#0f172a' : 'transparent',
              color: activeTab === 'form' ? '#ffffff' : '#475569',
              fontWeight: activeTab === 'form' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            🏦 Cadastro da Chave PIX
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            style={{
              padding: '0.45rem 0.95rem',
              borderRadius: '8px',
              border: activeTab === 'guide' ? '1px solid #0f172a' : '1px solid transparent',
              background: activeTab === 'guide' ? '#0f172a' : 'transparent',
              color: activeTab === 'guide' ? '#ffffff' : '#475569',
              fontWeight: activeTab === 'guide' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            📊 Regras de Repasse & Taxas
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
          {activeTab === 'guide' ? (
            <OrganizerFinancialGuide />
          ) : isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              Carregando dados da conta PIX...
            </div>
          ) : isSaved ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#15803d',
                  fontSize: '1.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                ✓
              </div>
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', color: '#0f172a', fontWeight: 700 }}>
                Dados do PIX Salvos com Sucesso!
              </h4>
              <p style={{ color: '#475569', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
                A sua chave PIX foi cadastrada com sucesso. O valor apurado das vendas será transferido diretamente via PIX para esta conta.
              </p>
              <button
                onClick={onClose}
                style={{
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.65rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Concluir
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {/* Quadro Informativo Detalhado das Regras Financeiras */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.15rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  Instruções de Repasse via PIX
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.83rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.35rem', lineHeight: 1.45 }}>
                  <li><strong>Transferência por PIX:</strong> O repasse das vendas é feito por PIX diretamente na sua conta em <strong>até 3 dias úteis</strong> após o encerramento do evento.</li>
                  <li><strong>Isento de Tarifas:</strong> O repasse por PIX é 100% isento de taxas de transferência bancária.</li>
                  <li><strong>Segurança:</strong> Certifique-se de conferir a Chave PIX e o Telefone de Contato antes de salvar.</li>
                </ul>
              </div>

              {errorMessage && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.75rem', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem' }}>
                  {errorMessage}
                </div>
              )}

              {/* 1. Banco */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                  Banco onde a Chave PIX está cadastrada *
                </label>
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', backgroundColor: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="001">001 - Banco do Brasil S.A.</option>
                  <option value="237">237 - Banco Bradesco S.A.</option>
                  <option value="341">341 - Itaú Unibanco S.A.</option>
                  <option value="033">033 - Banco Santander Brasil</option>
                  <option value="260">260 - Nu Pagamentos S.A. (Nubank)</option>
                  <option value="077">077 - Banco Inter S.A.</option>
                  <option value="104">104 - Caixa Econômica Federal</option>
                  <option value="999">Outro Banco</option>
                </select>
              </div>

              {/* 1b. Nome do banco customizado (apenas para Outro Banco) */}
              {bankCode === '999' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Qual o banco? *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Banco XP, C6 Bank, PagBank..."
                    value={customBankName}
                    onChange={(e) => setCustomBankName(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {/* 1c. Tipo de pessoa e CPF/CNPJ */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                  Tipo de Pessoa *
                </label>
                <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => { setPersonType('pf'); setDocument(''); setDocumentError(null) }}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: personType === 'pf' ? '2px solid #059669' : '1px solid #cbd5e1',
                      background: personType === 'pf' ? '#f0fdf4' : '#fff',
                      color: personType === 'pf' ? '#059669' : '#475569',
                      fontWeight: personType === 'pf' ? 700 : 500,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    👤 Pessoa Física
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPersonType('pj'); setDocument(''); setDocumentError(null) }}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      border: personType === 'pj' ? '2px solid #059669' : '1px solid #cbd5e1',
                      background: personType === 'pj' ? '#f0fdf4' : '#fff',
                      color: personType === 'pj' ? '#059669' : '#475569',
                      fontWeight: personType === 'pj' ? 700 : 500,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    🏢 Pessoa Jurídica
                  </button>
                </div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                  {personType === 'pf' ? 'CPF *' : 'CNPJ *'}
                </label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  placeholder={personType === 'pf' ? '000.000.000-00' : '00.000.000/0000-00'}
                  value={document}
                  onChange={(e) => handleDocumentChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: documentError
                      ? '#ef4444'
                      : isDocumentComplete() && !documentError
                      ? '#059669'
                      : '#cbd5e1',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                />
                {documentError && (
                  <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    ❌ {documentError}
                  </span>
                )}
                {isDocumentComplete() && !documentError && (
                  <span style={{ fontSize: '0.72rem', color: '#059669', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    ✅ {personType === 'pf' ? 'CPF válido' : 'CNPJ válido'}
                  </span>
                )}
              </div>

              {/* 2. Nome completo */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                  Nome Completo do Titular *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo do titular da conta"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* 3. Chave PIX e 4. Conferir Chave PIX */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Chave PIX *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="CPF, CNPJ, E-mail, Telefone ou Aleatória"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Conferir Chave PIX *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Digite novamente a Chave PIX"
                    value={confirmPixKey}
                    onChange={(e) => setConfirmPixKey(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: confirmPixKey && pixKey.trim() !== confirmPixKey.trim() ? '#ef4444' : '#cbd5e1',
                      fontSize: '0.88rem',
                      boxSizing: 'border-box',
                    }}
                  />
                  {confirmPixKey && pixKey.trim() !== confirmPixKey.trim() && (
                    <span style={{ fontSize: '0.72rem', color: '#ef4444', marginTop: '0.2rem', display: 'block' }}>
                      As chaves PIX não coincidem
                    </span>
                  )}
                </div>
              </div>

              {/* 5. Telefone para contato */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                  Telefone para Contato *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(00) 00000-0000"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '0.6rem 1.4rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                  }}
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Dados para Repasse via PIX'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

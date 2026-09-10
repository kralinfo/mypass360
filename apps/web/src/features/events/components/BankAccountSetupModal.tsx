'use client'

import React, { useEffect, useState } from 'react'
import { getOrganizerBankAccount, saveOrganizerBankAccount, BANK_NAME_MAP } from '../services/bank-account.service'
import { OrganizerFinancialGuide } from './OrganizerFinancialGuide'

interface BankAccountSetupModalProps {
  isOpen: boolean
  onClose: () => void
  eventId?: string
  onSaved?: () => void
}

export function BankAccountSetupModal({ isOpen, onClose, eventId, onSaved }: BankAccountSetupModalProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'guide'>('form')
  const [personType, setPersonType] = useState<'pf' | 'pj'>('pf')
  const [document, setDocument] = useState('')
  const [holderName, setHolderName] = useState('')
  const [bankCode, setBankCode] = useState('001')
  const [accountType, setAccountType] = useState<'corrente' | 'poupanca'>('corrente')
  const [agency, setAgency] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountDigit, setAccountDigit] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Carregar conta salva existente ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      setIsSaved(false)
      setErrorMessage(null)
      setIsLoading(true)
      getOrganizerBankAccount()
        .then((savedAccount) => {
          if (savedAccount) {
            setPersonType(savedAccount.person_type || 'pf')
            setDocument(savedAccount.document || '')
            setHolderName(savedAccount.holder_name || '')
            setBankCode(savedAccount.bank_code || '001')
            setAccountType(savedAccount.account_type || 'corrente')
            setAgency(savedAccount.agency || '')
            setAccountNumber(savedAccount.account_number || '')
            setAccountDigit(savedAccount.account_digit || '')
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await saveOrganizerBankAccount(
        {
          person_type: personType,
          holder_name: holderName,
          document: document,
          bank_code: bankCode,
          bank_name: BANK_NAME_MAP[bankCode] || 'Outro Banco',
          account_type: accountType,
          agency: agency,
          account_number: accountNumber,
          account_digit: accountDigit,
        },
        eventId
      )

      setIsSaved(true)
      if (onSaved) onSaved()
    } catch (err) {
      console.error('Erro ao salvar conta bancária:', err)
      setErrorMessage('Ocorreu um erro ao salvar os dados bancários. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFreeBank = ['001', '237', '341', '033'].includes(bankCode)

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
                Financeiro & Repasses de Vendas
              </h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
                Gestão de conta bancária, prazos pós-evento e repasse transparente de taxas
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
            🏦 Dados da Conta Bancária
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
              Carregando dados da conta bancária...
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
                Conta Cadastrada e Salva com Sucesso!
              </h4>
              <p style={{ color: '#475569', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
                Os dados bancários foram salvos no sistema. O valor das suas vendas será repassado para esta conta em até 3 dias úteis após o encerramento do evento.
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
                  Resumo das Regras de Recebimento & Taxas
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.83rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.35rem', lineHeight: 1.45 }}>
                  <li><strong>Prazo de Liquidação:</strong> O repasse líquido das vendas é efetuado em <strong>até 3 dias úteis</strong> após o encerramento do seu evento.</li>
                  <li><strong>Repasse de Taxa Transparente:</strong> A taxa de serviço da plataforma é acrescida no valor pago pelo comprador no checkout. Você recebe <strong>100% do valor nominal</strong> do seu ingresso.</li>
                  <li><strong>Política de Estorno:</strong> Em cancelamentos, é reembolsado ao comprador exclusivamente o valor nominal do ingresso (a taxa de serviço não é objeto de restituição).</li>
                  <li><strong>Titularidade Obrigatória:</strong> A conta cadastrada deve pertencer ao mesmo CPF ou CNPJ informado em “Minha Conta”.</li>
                  <li><strong>Isenção de Tarifa:</strong> Transferências para Banco do Brasil, Bradesco, Itaú e Santander são <strong>gratuitas</strong> (R$ 7,50 para demais bancos).</li>
                </ul>
              </div>

              {errorMessage && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.75rem', borderRadius: '8px', color: '#991b1b', fontSize: '0.85rem' }}>
                  {errorMessage}
                </div>
              )}

              {/* Tipo de Pessoa */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Tipo de Titular
                </label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', color: '#0f172a', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="personType"
                      checked={personType === 'pf'}
                      onChange={() => setPersonType('pf')}
                    />
                    Pessoa Física (CPF)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', color: '#0f172a', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="personType"
                      checked={personType === 'pj'}
                      onChange={() => setPersonType('pj')}
                    />
                    Pessoa Jurídica (CNPJ)
                  </label>
                </div>
              </div>

              {/* Nome do Titular e Documento */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Nome do Titular *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nome completo ou Razão"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    {personType === 'pf' ? 'CPF do Titular *' : 'CNPJ da Empresa *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={personType === 'pf' ? '000.000.000-00' : '00.000.000/0001-00'}
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Seleção do Banco */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                  Banco *
                </label>
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', backgroundColor: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="001">001 - Banco do Brasil S.A. (Transferência Gratuita ✓)</option>
                  <option value="237">237 - Banco Bradesco S.A. (Transferência Gratuita ✓)</option>
                  <option value="341">341 - Itaú Unibanco S.A. (Transferência Gratuita ✓)</option>
                  <option value="033">033 - Banco Santander Brasil (Transferência Gratuita ✓)</option>
                  <option value="260">260 - Nu Pagamentos S.A. (Nubank - R$ 7,50 por evento)</option>
                  <option value="077">077 - Banco Inter S.A. (R$ 7,50 por evento)</option>
                  <option value="104">104 - Caixa Econômica Federal (R$ 7,50 por evento)</option>
                  <option value="999">Outro Banco (R$ 7,50 por evento)</option>
                </select>
                <div style={{ fontSize: '0.78rem', marginTop: '0.3rem', color: isFreeBank ? '#059669' : '#b45309', fontWeight: 600 }}>
                  {isFreeBank ? '✓ Banco parceiro com transferência gratuita por evento!' : '⚠️ Tarifa bancária de R$ 7,50 aplicável no repasse.'}
                </div>
              </div>

              {/* Tipo de Conta */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                  Tipo de Conta *
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as 'corrente' | 'poupanca')}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', backgroundColor: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="corrente">Conta Corrente</option>
                  <option value="poupanca">Conta Poupança</option>
                </select>
              </div>

              {/* Agência e Número da Conta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Agência *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0000"
                    value={agency}
                    onChange={(e) => setAgency(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Número da Conta *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="00000000"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                    Dígito *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0"
                    value={accountDigit}
                    onChange={(e) => setAccountDigit(e.target.value)}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', boxSizing: 'border-box' }}
                  />
                </div>
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
                  {isSubmitting ? 'Salvando...' : 'Salvar Dados Bancários'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

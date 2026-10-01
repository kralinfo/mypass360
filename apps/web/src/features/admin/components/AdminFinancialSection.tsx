'use client'

import React, { useEffect, useState } from 'react'
import type { AdminDashboardData, Event } from '@mypass360/types'
import { getAllOrganizerBankAccounts, type BankAccountData } from '@/features/events/services/bank-account.service'
import { formatCurrency } from '@/features/admin/admin.utils'
import { createClient } from '@/lib/supabase/client'

interface AdminFinancialSectionProps {
  dashboard: AdminDashboardData | null
}

export function AdminFinancialSection({ dashboard }: AdminFinancialSectionProps) {
  const [bankAccountsMap, setBankAccountsMap] = useState<Record<string, BankAccountData>>({})
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)
  const [filterText, setFilterText] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [notifiedId, setNotifiedId] = useState<string | null>(null)
  const [notifyingId, setNotifyingId] = useState<string | null>(null)

  useEffect(() => {
    setIsLoadingAccounts(true)
    getAllOrganizerBankAccounts()
      .then((map) => {
        setBankAccountsMap(map)
      })
      .catch((err) => {
        console.error('Erro ao carregar contas bancárias dos organizadores:', err)
      })
      .finally(() => {
        setIsLoadingAccounts(false)
      })
  }, [])

  const events: Event[] = (dashboard?.events || []) as unknown as Event[]

  const filteredEvents = events.filter((ev: Event) => {
    if (!filterText) return true
    const text = filterText.toLowerCase()
    return (
      ev.title.toLowerCase().includes(text) ||
      (ev.organizer_id && ev.organizer_id.toLowerCase().includes(text)) ||
      ev.location.toLowerCase().includes(text)
    )
  })

  // Copiar apenas a Chave PIX para a área de transferência
  const handleCopyPixKey = (pixKey: string, eventId: string) => {
    navigator.clipboard.writeText(pixKey)
    setCopiedId(eventId)
    setTimeout(() => setCopiedId(null), 2500)
  }

  // Enviar notificação ao organizador pedindo o cadastro da Chave PIX
  const handleNotifyOrganizer = async (ev: Event) => {
    if (!ev.organizer_id) return
    setNotifyingId(ev.id)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('notifications').insert({
        user_id: ev.organizer_id,
        type: 'pix_key_missing',
        title: '⚠️ Chave PIX não cadastrada',
        message: `O repasse das vendas do evento "${ev.title}" está pendente. Por favor, acesse o painel do seu evento e cadastre sua Chave PIX para receber o valor apurado.`,
        entity_type: 'event',
        entity_id: ev.id,
        action_url: `/meus-eventos`,
        metadata: { event_title: ev.title },
      })
      if (error) throw error
      setNotifiedId(ev.id)
      setTimeout(() => setNotifiedId(null), 4000)
    } catch (err) {
      console.error('Erro ao enviar notificação ao organizador:', err)
      alert('Não foi possível enviar a notificação. Tente novamente.')
    } finally {
      setNotifyingId(null)
    }
  }

  // Totais globais
  const totalGrossRevenue = events.reduce((acc: number, ev: Event) => acc + (ev.price * (ev.capacity || 0) * 0.4), 0)
  const totalPlatformFees = totalGrossRevenue * 0.125
  const totalNetPayout = totalGrossRevenue - totalPlatformFees

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Cards de Métricas Financeiras Executivas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Vendas Brutas Totais
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', marginTop: '0.3rem' }}>
            {formatCurrency(totalGrossRevenue)}
          </div>
          <span style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.2rem', display: 'block' }}>
            ● Base consolidada de vendas
          </span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Taxas Retidas (10% + 2.5%)
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4f46e5', marginTop: '0.3rem' }}>
            {formatCurrency(totalPlatformFees)}
          </div>
          <span style={{ fontSize: '0.8rem', color: '#6366f1', marginTop: '0.2rem', display: 'block' }}>
            Receita da Plataforma MyPass360
          </span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total a Repassar aos Organizadores
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#059669', marginTop: '0.3rem' }}>
            {formatCurrency(totalNetPayout)}
          </div>
          <span style={{ fontSize: '0.8rem', color: '#059669', marginTop: '0.2rem', display: 'block' }}>
            Valores líquidos para transferência
          </span>
        </div>
      </div>

      {/* Caixa de Busca e Filtros */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: '#ffffff', padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.2rem' }}>💰</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              Gestão de Repasses Financeiros
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
              Consulte a conta bancária vinculada de cada organizador para realizar o envio das vendas
            </p>
          </div>
        </div>

        <input
          type="text"
          placeholder="Buscar por título ou ID..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{
            padding: '0.55rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '0.88rem',
            width: '260px',
          }}
        />
      </div>

      {/* Tabela de Eventos e Contas Bancárias para Repasse */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '1rem 1.25rem' }}>Evento & Data</th>
                <th style={{ padding: '1rem 1.25rem' }}>Organizador</th>
                <th style={{ padding: '1rem 1.25rem' }}>Vendas Brutas</th>
                <th style={{ padding: '1rem 1.25rem' }}>Repasse Líquido</th>
                <th style={{ padding: '1rem 1.25rem' }}>Conta Bancária Cadastrada</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>Ação de Repasse</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    {isLoadingAccounts ? 'Carregando contas bancárias...' : 'Nenhum evento encontrado para repasse.'}
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev: Event) => {
                  // Localiza a conta por event_id ou por user_id (organizer_id)
                  const bankAccount = bankAccountsMap[ev.id] || bankAccountsMap[ev.organizer_id] || null

                  // Cálculo estimado de valores (PIX é isento de taxa de transferência)
                  const gross = ev.price * (ev.capacity > 0 ? Math.min(ev.capacity, 50) : 10)
                  const platformFee = gross * 0.125
                  const netPayout = Math.max(0, gross - platformFee)

                  const formattedDate = new Date(ev.date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })

                  return (
                    <tr key={ev.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                      {/* Evento & Data */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{ev.title}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                          📅 {formattedDate} | Status: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{ev.status}</span>
                        </div>
                      </td>

                      {/* Organizador */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                          {ev.organizer_id ? `ID: ${ev.organizer_id.substring(0, 8)}...` : 'Organizador do Evento'}
                        </div>
                      </td>

                      {/* Vendas Brutas */}
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#0f172a' }}>
                        {formatCurrency(gross)}
                      </td>

                      {/* Repasse Líquido */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>
                          {formatCurrency(netPayout)}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                          Taxa retida: -{formatCurrency(platformFee)}
                        </div>
                      </td>

                      {/* Chave PIX e Conta */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {bankAccount ? (
                          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.65rem 0.85rem' }}>
                            <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span>🏦</span> {bankAccount.bank_name}
                              <span style={{ marginLeft: 'auto', background: bankAccount.person_type === 'pj' ? '#dbeafe' : '#ede9fe', color: bankAccount.person_type === 'pj' ? '#1d4ed8' : '#6d28d9', fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '999px' }}>
                                {bankAccount.person_type === 'pj' ? 'PJ' : 'PF'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '0.2rem' }}>
                              <strong>Titular:</strong> {bankAccount.holder_name}
                            </div>
                            {bankAccount.document && (
                              <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.1rem' }}>
                                <strong>{bankAccount.person_type === 'pj' ? 'CNPJ' : 'CPF'}:</strong> {bankAccount.document}
                              </div>
                            )}
                            <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '0.1rem', fontWeight: 600 }}>
                              <strong>Chave PIX:</strong> {bankAccount.pix_key || '—'}
                            </div>
                            {bankAccount.contact_phone && (
                              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.1rem' }}>
                                📞 {bankAccount.contact_phone}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '0.65rem 0.85rem', color: '#b45309', fontSize: '0.8rem' }}>
                            ⚠️ <strong>Pendente:</strong> O organizador ainda não cadastrou a Chave PIX no painel.
                          </div>
                        )}
                      </td>

                      {/* Ação */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        {bankAccount ? (
                          <button
                            type="button"
                            onClick={() => handleCopyPixKey(bankAccount.pix_key || '', ev.id)}
                            disabled={!bankAccount.pix_key}
                            style={{
                              backgroundColor: copiedId === ev.id ? '#16a34a' : bankAccount.pix_key ? '#059669' : '#94a3b8',
                              color: '#ffffff',
                              border: 'none',
                              padding: '0.5rem 0.9rem',
                              borderRadius: '8px',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              cursor: bankAccount.pix_key ? 'pointer' : 'not-allowed',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              boxShadow: bankAccount.pix_key ? '0 2px 4px rgba(5, 150, 105, 0.2)' : 'none',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {copiedId === ev.id ? (
                              <>✓ Chave Copiada!</>
                            ) : (
                              <>🔑 Copiar Chave PIX</>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleNotifyOrganizer(ev)}
                            disabled={notifyingId === ev.id || notifiedId === ev.id}
                            style={{
                              backgroundColor: notifiedId === ev.id ? '#6d28d9' : notifyingId === ev.id ? '#94a3b8' : '#f59e0b',
                              color: '#ffffff',
                              border: 'none',
                              padding: '0.5rem 0.9rem',
                              borderRadius: '8px',
                              fontWeight: 600,
                              fontSize: '0.8rem',
                              cursor: notifyingId === ev.id || notifiedId === ev.id ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {notifiedId === ev.id ? (
                              <>✓ Notificado!</>
                            ) : notifyingId === ev.id ? (
                              <>Enviando...</>
                            ) : (
                              <>🔔 Notificar Organizador</>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useState } from 'react'

interface OrganizerFinancialGuideProps {
  onOpenBankAccountModal?: () => void
}

export function OrganizerFinancialGuide({ onOpenBankAccountModal }: OrganizerFinancialGuideProps) {
  const [ticketPriceInput, setTicketPriceInput] = useState<string>('100')
  const [ticketQtyInput, setTicketQtyInput] = useState<string>('10')
  const [selectedBank, setSelectedBank] = useState<string>('bb')

  const ticketPrice = Math.max(0, parseFloat(ticketPriceInput.replace(/\D/g, '')) || 0)
  const ticketQty = Math.max(1, parseInt(ticketQtyInput.replace(/\D/g, ''), 10) || 1)
  
  // Taxa de serviço da plataforma repassada ao comprador (ex: 5% a 10%)
  const feePercent = 0.05 // 5%
  const feePerTicket = ticketPrice * feePercent
  const totalPricePerTicket = ticketPrice + feePerTicket

  const totalGrossRevenue = ticketPrice * ticketQty
  const isFreeBank = ['bb', 'bradesco', 'itau', 'santander'].includes(selectedBank)
  const transferFee = totalGrossRevenue > 0 ? (isFreeBank ? 0 : 7.50) : 0
  const netPayout = Math.max(0, totalGrossRevenue - transferFee)

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', color: '#0f172a', fontFamily: 'inherit' }}>
      {/* Cabeçalho Executivo */}
      <div
        style={{
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #a7f3d0' }}>
              Guia de Recebimentos
            </span>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Atualizado recentemente</span>
          </div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Como Receber Suas Vendas na Conta Bancária
          </h3>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.9rem', color: '#475569' }}>
            O repasse das suas vendas é feito por transferência bancária (TED/PIX) após a conclusão do seu evento.
          </p>
        </div>

        {onOpenBankAccountModal && (
          <button
            onClick={onOpenBankAccountModal}
            style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '0.65rem 1.15rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.2)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#047857')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
          >
            Cadastrar Conta para Repasse →
          </button>
        )}
      </div>

      {/* Exemplo Prático de Repasse de Taxas no Modelo Mercado Pago */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', color: '#0f172a', fontWeight: 700 }}>
          Funcionamento das Taxas e Repasse de Conveniência
        </h4>
        <p style={{ margin: '0 0 1rem', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
          As taxas de serviço da plataforma são repassadas e acrescidas diretamente no valor final pago pelo comprador (modelo transparente estilo Mercado Pago). Dessa forma, você recebe <strong>100% do valor nominal</strong> cadastrado do seu ingresso.
        </p>

        {/* Quadro Exemplo Prático em Tabela */}
        <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Exemplo Prático de Venda
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
            <div style={{ background: '#ffffff', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Preço do seu Ingresso</span>
              <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>R$ 100,00</strong>
              <span style={{ display: 'block', fontSize: '0.72rem', color: '#059669', marginTop: '0.1rem' }}>Valor que você recebe</span>
            </div>

            <div style={{ background: '#ffffff', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Taxa de Serviço (5%)</span>
              <strong style={{ fontSize: '1.1rem', color: '#4f46e5' }}>+ R$ 5,00</strong>
              <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginTop: '0.1rem' }}>Acrescida na compra</span>
            </div>

            <div style={{ background: '#ffffff', padding: '0.75rem 0.9rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Total Pago pelo Comprador</span>
              <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>R$ 105,00</strong>
              <span style={{ display: 'block', fontSize: '0.72rem', color: '#475569', marginTop: '0.1rem' }}>Valor no checkout</span>
            </div>
          </div>
        </div>

        {/* Regra de Estorno / Reembolso */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.85rem 1rem', color: '#92400e', fontSize: '0.85rem', lineHeight: 1.5 }}>
          <strong>Política de Estorno e Reembolso:</strong> Em situações em que um comprador solicitar o estorno ou cancelamento da compra, o valor estornado ao cliente corresponderá <strong>exclusivamente ao valor nominal do ingresso (R$ 100,00)</strong>. A taxa de conveniência/serviço da plataforma de R$ 5,00 já processada não é objeto de restituição ao comprador.
        </div>
      </div>

      {/* Cronograma de Repasse e Tarifas Bancárias */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>
            Prazo de Recebimento
          </h4>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
            Após o encerramento do evento, o valor total apurado das vendas é depositado na sua conta cadastrada em <strong>até 3 dias úteis, até às 18h</strong>.
          </p>
          <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.78rem', color: '#64748b' }}>
            * Prazos sujeitos a alterações em feriados bancários e nacionais.
          </span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>
            Tarifas de Transferência Bancária
          </h4>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
            A transferência é <strong>GRATUITA</strong> se a conta cadastrada for dos bancos parceiros: <strong>Banco do Brasil, Bradesco, Itaú ou Santander</strong>.
          </p>
          <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.78rem', color: '#64748b' }}>
            Para demais instituições financeiras, é deduzida uma taxa de <strong>R$ 7,50 por evento</strong>.
          </span>
        </div>
      </div>

      {/* Simulador Interativo Limpo e Profissional */}
      <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
        <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>
          Simulador de Repasse do Organizador
        </h4>
        <p style={{ margin: '0 0 1rem', fontSize: '0.83rem', color: '#64748b' }}>
          Simule o valor que seu comprador pagará e o valor exato a ser transferido para sua conta.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
              Preço Unitário do Ingresso (R$)
            </label>
            <input
              type="text"
              value={ticketPriceInput}
              onChange={(e) => setTicketPriceInput(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                fontWeight: 600,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
              Qtd. de Ingressos Vendidos
            </label>
            <input
              type="text"
              value={ticketQtyInput}
              onChange={(e) => setTicketQtyInput(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                fontWeight: 600,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
              Banco da Conta de Repasse
            </label>
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            >
              <option value="bb">Banco do Brasil (Grátis)</option>
              <option value="bradesco">Bradesco (Grátis)</option>
              <option value="itau">Itaú (Grátis)</option>
              <option value="santander">Santander (Grátis)</option>
              <option value="nubank">Nubank (R$ 7,50)</option>
              <option value="inter">Banco Inter (R$ 7,50)</option>
              <option value="outros">Outros Bancos (R$ 7,50)</option>
            </select>
          </div>
        </div>

        {/* Resumo Consolidado */}
        <div style={{ background: '#ffffff', borderRadius: '8px', padding: '0.9rem 1.1rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
            <span>Valor exibido no checkout ao comprador (por ingresso):</span>
            <strong style={{ color: '#0f172a' }}>{formatCurrency(totalPricePerTicket)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
            <span>Total nominal arrecadado ({ticketQty} x {formatCurrency(ticketPrice)}):</span>
            <strong style={{ color: '#0f172a' }}>{formatCurrency(totalGrossRevenue)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
            <span>Tarifa de transferência bancária:</span>
            <span style={{ color: isFreeBank ? '#059669' : '#dc2626', fontWeight: 600 }}>
              {isFreeBank ? 'Isento (Banco Parceiro)' : `- ${formatCurrency(transferFee)}`}
            </span>
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', marginTop: '0.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Valor Líquido Depositado na sua Conta:</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669' }}>{formatCurrency(netPayout)}</span>
          </div>
        </div>
      </div>

      {/* Regras de Validação de CPF/CNPJ */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '1.25rem' }}>
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>
          Requisitos da Conta Bancária
        </h4>
        <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.85rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <li>A conta pode ser de <strong>Pessoa Física (CPF)</strong> ou <strong>Pessoa Jurídica (CNPJ)</strong>.</li>
          <li>O CPF ou CNPJ do titular da conta deve obrigatoriamente corresponder ao documento registrado no perfil <strong>“Minha Conta”</strong>.</li>
        </ul>
      </div>
    </div>
  )
}

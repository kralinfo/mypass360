'use client'

import React from 'react'

interface FeeRefundDisclaimerProps {
  variant?: 'card' | 'compact' | 'cart'
  style?: React.CSSProperties
}

export function FeeRefundDisclaimer({ variant = 'card', style }: FeeRefundDisclaimerProps) {
  if (variant === 'compact') {
    return (
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '10px',
          padding: '0.75rem 0.9rem',
          fontSize: '0.825rem',
          color: '#334155',
          display: 'flex',
          gap: '0.6rem',
          alignItems: 'flex-start',
          lineHeight: '1.45',
          ...style,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0284c7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, marginTop: '2px' }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <div>
          <strong style={{ color: '#0f172a', fontWeight: 600, display: 'block', marginBottom: '0.15rem' }}>
            Transparência de Taxas e Reembolso
          </strong>
          O valor final inclui taxas de serviço/conveniência (ex: Mercado Pago). Em caso de solicitação de cancelamento ou estorno, o reembolso corresponde <strong>exclusivamente ao valor nominal do ingresso</strong> (sem restituição de taxas de serviço).
        </div>
      </div>
    )
  }

  if (variant === 'cart') {
    return (
      <div
        style={{
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '12px',
          padding: '0.85rem 1rem',
          fontSize: '0.85rem',
          color: '#0369a1',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
          lineHeight: '1.5',
          ...style,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0284c7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, marginTop: '2px' }}
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <div>
          <strong style={{ color: '#0c4a6e', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>
            Política de Taxas e Reembolso
          </strong>
          Os valores informados contemplam taxas de serviço de processamento (ex: Mercado Pago). Em reembolsos ou cancelamentos, será devolvido <strong>somente o valor nominal do ingresso</strong>. A taxa de conveniência/serviço não é reembolsável.
        </div>
      </div>
    )
  }

  // Variant "card" (padrão para CheckoutForm)
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        border: '1px solid #7dd3fc',
        borderRadius: '12px',
        padding: '1rem 1.15rem',
        color: '#0369a1',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        boxShadow: '0 1px 3px rgba(3, 105, 161, 0.05)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0284c7"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span style={{ fontWeight: 700, fontSize: '0.925rem', color: '#0c4a6e' }}>
          Transparência de Taxas & Política de Reembolso
        </span>
      </div>

      <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.5', color: '#0369a1' }}>
        O valor cobrado pode incluir taxas de serviço e processamento de pagamento (ex: Mercado Pago).
      </p>

      <div
        style={{
          background: 'rgba(255, 255, 255, 0.75)',
          border: '1px solid #bae6fd',
          borderRadius: '8px',
          padding: '0.65rem 0.85rem',
          fontSize: '0.825rem',
          color: '#0369a1',
          lineHeight: '1.45',
        }}
      >
        <strong style={{ color: '#0c4a6e' }}>Atenção em caso de estorno ou cancelamento:</strong>
        <br />
        O valor a ser restituído ao comprador corresponderá <strong>exclusivamente ao valor nominal do ingresso</strong>. A taxa de conveniência/processamento de pagamento não é objeto de restituição.
        <br />
        <span style={{ fontSize: '0.775rem', color: '#0284c7', display: 'block', marginTop: '0.35rem', fontStyle: 'italic' }}>
          Exemplo: Se o ingresso custa R$ 100,00 e o total pago for R$ 105,00 (devido a R$ 5,00 de taxa), em caso de reembolso você receberá os R$ 100,00 do ingresso.
        </span>
      </div>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import Link from 'next/link'

interface OrganizerManualModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: string
}

type TabType = 'criacao' | 'ingressos' | 'publicacao' | 'exclusao' | 'checkin'

export function OrganizerManualModal({ isOpen, onClose, initialTab = 'criacao' }: OrganizerManualModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>((initialTab as TabType) || 'criacao')
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)

  if (!isOpen) return null

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'criacao', label: '1. Criação do Evento', icon: '📝' },
    { id: 'ingressos', label: '2. Ingressos e Lotes', icon: '🎟️' },
    { id: 'publicacao', label: '3. Solicitar Publicação', icon: '🚀' },
    { id: 'exclusao', label: '4. Solicitar Exclusão', icon: '🗑️' },
    { id: 'checkin', label: '5. Validação & Check-in', icon: '📱' },
  ]

  const tabKeys: TabType[] = ['criacao', 'ingressos', 'publicacao', 'exclusao', 'checkin']
  const currentIndex = tabKeys.indexOf(activeTab)

  const handleNext = () => {
    if (currentIndex < tabKeys.length - 1) {
      setActiveTab(tabKeys[currentIndex + 1])
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setActiveTab(tabKeys[currentIndex - 1])
    }
  }

  const toggleFaq = (id: string) => {
    setExpandedFaq((prev) => (prev === id ? null : id))
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(4px)',
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
            color: '#0f172a',
            padding: '1.4rem 1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#e0e7ff',
                color: '#4338ca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                boxShadow: '0 2px 6px rgba(99, 102, 241, 0.15)',
              }}
            >
              📖
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                Manual do Organizador MyPass360
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0' }}>
                Guia interativo completo de gestão de eventos, ingressos, aprovações e check-in
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#e2e8f0',
              border: 'none',
              color: '#64748b',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1.1rem',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#cbd5e1'
              e.currentTarget.style.color = '#0f172a'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#e2e8f0'
              e.currentTarget.style.color = '#64748b'
            }}
            title="Fechar manual"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.4rem',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            padding: '0.75rem 1.25rem',
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 0.95rem',
                  borderRadius: '10px',
                  border: isActive ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                  background: isActive ? '#4f46e5' : '#ffffff',
                  color: isActive ? '#ffffff' : '#334155',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: isActive ? '0 2px 6px rgba(79, 70, 229, 0.25)' : 'none',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#f1f5f9'
                    e.currentTarget.style.borderColor = '#94a3b8'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#ffffff'
                    e.currentTarget.style.borderColor = '#cbd5e1'
                  }
                }}
              >
                <span style={{ fontSize: '1.05rem' }}>{tab.icon}</span>
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Body Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.75rem',
            color: '#1e293b',
            lineHeight: 1.6,
          }}
        >
          {/* TAB 1: CRIAÇÃO DO EVENTO */}
          {activeTab === 'criacao' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div
                  style={{
                    background: '#e0e7ff',
                    color: '#4338ca',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    fontSize: '1.5rem',
                  }}
                >
                  📝
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.4rem', color: '#0f172a' }}>
                    Como criar um evento no MyPass360
                  </h3>
                  <p style={{ color: '#475569', fontSize: '0.95rem', margin: 0 }}>
                    Criar um evento é simples e leva apenas alguns minutos. Siga os passos essenciais para estruturar seu evento com todas as informações necessárias.
                  </p>
                </div>
              </div>

              {/* Step Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Passo 1
                  </div>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: '#0f172a' }}>Informações Básicas</h4>
                  <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
                    Insira o <strong>Título</strong>, <strong>Descrição completa</strong>, <strong>Categoria</strong> e <strong>Banner Promocional</strong> (formato recomendado 16:9).
                  </p>
                </div>

                <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Passo 2
                  </div>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: '#0f172a' }}>Datas e Localização</h4>
                  <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
                    Defina a <strong>Data e Hora de Início/Término</strong> e o <strong>Endereço do Local</strong> com CEP e Cidade para busca no mapa.
                  </p>
                </div>

                <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Passo 3
                  </div>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: '#0f172a' }}>Status Inicial</h4>
                  <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
                    Todo novo evento nasce no status <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>Rascunho / Pendente</span>, garantindo que você revise tudo antes de publicar.
                  </p>
                </div>
              </div>

              {/* Accordion FAQ */}
              <div style={{ marginTop: '0.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', marginBottom: '0.75rem' }}>
                  💡 Dicas para uma excelente aprovação
                </h4>

                <div
                  onClick={() => toggleFaq('faq-1')}
                  style={{
                    padding: '0.9rem 1.1rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    cursor: 'pointer',
                    marginBottom: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                    <span>Qual o tamanho ideal do banner do evento?</span>
                    <span>{expandedFaq === 'faq-1' ? '▲' : '▼'}</span>
                  </div>
                  {expandedFaq === 'faq-1' && (
                    <p style={{ margin: '0.6rem 0 0', fontSize: '0.85rem', color: '#475569' }}>
                      Recomendamos imagens horizontais (1200x675 pixels ou proporção 16:9). Evite textos muito pequenos na capa para boa leitura em celulares.
                    </p>
                  )}
                </div>

                <div
                  onClick={() => toggleFaq('faq-2')}
                  style={{
                    padding: '0.9rem 1.1rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>
                    <span>Onde meu evento fica visível após ser criado?</span>
                    <span>{expandedFaq === 'faq-2' ? '▲' : '▼'}</span>
                  </div>
                  {expandedFaq === 'faq-2' && (
                    <p style={{ margin: '0.6rem 0 0', fontSize: '0.85rem', color: '#475569' }}>
                      Ele estará visível somente na sua tela de <strong>Meus Eventos</strong>. Para aparecer na vitrine pública e permitir vendas aos clientes, é necessário solicitar a publicação!
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INGRESSOS E LOTES */}
          {activeTab === 'ingressos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div
                  style={{
                    background: '#fae8ff',
                    color: '#86198f',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    fontSize: '1.5rem',
                  }}
                >
                  🎟️
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.4rem', color: '#0f172a' }}>
                    Gerenciando Ingressos e Lotes
                  </h3>
                  <p style={{ color: '#475569', fontSize: '0.95rem', margin: 0 }}>
                    Você pode cadastrar diferentes modalidades de ingressos para atender variados perfis de participantes e estratégias de venda.
                  </p>
                </div>
              </div>

              {/* Types Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                      GRATUITO
                    </span>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Ingresso Grátis / VIP</h4>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
                    Ideal para eventos abertos, cortesias, palestras gratuitas ou lista VIP. Não há cobrança de taxa de conveniência.
                  </p>
                </div>

                <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                      PAGO
                    </span>
                    <h4 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>Ingresso Pago (por Lotes)</h4>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
                    Configure o preço individual em R$, quantidade total disponível e prazo de venda. Permite criar 1º Lote, 2º Lote, Pista, VIP, etc.
                  </p>
                </div>
              </div>

              {/* Best practices box */}
              <div style={{ padding: '1.25rem', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🎯</span> Estratégia Recomendada de Lotes
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.88rem', color: '#15803d', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <li><strong>Lote 1 (Promocional):</strong> Preço reduzido e quantidade limitada para gerar urgência de compra inicial.</li>
                  <li><strong>Lote 2 (Regular):</strong> Preço normal de venda à medida que a data do evento se aproxima.</li>
                  <li><strong>Limite por Usuário:</strong> Defina um limite de ingressos por CPF para evitar revenda ilegal (cambistas).</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: SOLICITAR PUBLICAÇÃO */}
          {activeTab === 'publicacao' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div
                  style={{
                    background: '#e0f2fe',
                    color: '#0369a1',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    fontSize: '1.5rem',
                  }}
                >
                  🚀
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.4rem', color: '#0f172a' }}>
                    Como funciona a Solicitação de Publicação
                  </h3>
                  <p style={{ color: '#475569', fontSize: '0.95rem', margin: 0 }}>
                    Para garantir a segurança, integridade e qualidade das ofertas no MyPass360, todo evento passa por uma análise antes de ser publicado.
                  </p>
                </div>
              </div>

              {/* Process Workflow Diagram */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                    1
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 0.2rem', fontSize: '0.95rem', color: '#0f172a' }}>Clique no botão &quot;Solicitar Publicação&quot;</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      No card do seu evento em <strong>Meus Eventos</strong>, clique no botão azul de publicação quando os dados e ingressos estiverem prontos.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                    2
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 0.2rem', fontSize: '0.95rem', color: '#0f172a' }}>Análise pela Equipe Administrativa</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      O status mudará para <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>Aprovação Pendente</span>. A equipe revisará as informações em até poucas horas.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                    3
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 0.2rem', fontSize: '0.95rem', color: '#0f172a' }}>Resultado & Notificação</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      <strong>Se Aprovado:</strong> O evento fica imediatamente publicado e aberto para vendas.<br />
                      <strong>Se Rejeitado:</strong> O administrador enviará o motivo. Você receberá uma notificação interativa e poderá corrigir e reenviar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SOLICITAR EXCLUSÃO */}
          {activeTab === 'exclusao' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div
                  style={{
                    background: '#fef2f2',
                    color: '#dc2626',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    fontSize: '1.5rem',
                  }}
                >
                  🗑️
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.4rem', color: '#0f172a' }}>
                    Por que e como solicitar a Exclusão de um Evento?
                  </h3>
                  <p style={{ color: '#475569', fontSize: '0.95rem', margin: 0 }}>
                    A exclusão de eventos no MyPass360 é um processo seguro que exige solicitação com justificativa administrativa.
                  </p>
                </div>
              </div>

              {/* Warning Banner */}
              <div style={{ padding: '1.1rem', borderRadius: '12px', background: '#fff1f2', border: '1px solid #fecdd3' }}>
                <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem', color: '#9f1239', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>⚠️</span> Proteção aos Compradores
                </h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#be123c' }}>
                  Eventos não podem ser excluídos diretamente de forma instantânea para evitar o cancelamento inadvertido de pedidos já pagos por clientes e garantir a prestação de suporte ou reembolso quando aplicável.
                </p>
              </div>

              {/* Steps */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem', color: '#0f172a' }}>1. Preencher Justificativa</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    Ao clicar no ícone de lixeira no card do evento, informe detalhadamente o motivo do cancelamento/exclusão.
                  </p>
                </div>

                <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem', color: '#0f172a' }}>2. Análise pelo Admin</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    A equipe verifica se existem ingressos vendidos, solicitações financeiras pendentes ou necessidade de aviso prévio aos inscritos.
                  </p>
                </div>

                <div style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <h4 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem', color: '#0f172a' }}>3. Resposta & Diálogo</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    Se a exclusão for reprovada, você receberá uma notificação interativa com a mensagem do admin e um modal para responder diretamente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: VALIDAÇÃO & CHECK-IN */}
          {activeTab === 'checkin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div
                  style={{
                    background: '#f0fdf4',
                    color: '#16a34a',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    fontSize: '1.5rem',
                  }}
                >
                  📱
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.4rem', color: '#0f172a' }}>
                    Guia Detalhado de Validação e Check-in na Portaria
                  </h3>
                  <p style={{ color: '#475569', fontSize: '0.95rem', margin: 0 }}>
                    Aprenda a abrir o terminal de leitura, compartilhar o código com a equipe de recepção e validar ingressos direto do celular.
                  </p>
                </div>
              </div>

              {/* SECTION 1: CÓDIGO DE LIBERAÇÃO DA PORTARIA */}
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: '14px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1e3a8a',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>🔑</span>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#1e40af', fontWeight: 700 }}>
                    O que é o Código de Liberação da Portaria?
                  </h4>
                </div>
                <p style={{ margin: '0 0 0.8rem', fontSize: '0.9rem', color: '#1e3a8a', lineHeight: 1.5 }}>
                  É um <strong>PIN de acesso seguro</strong> gerado automaticamente para cada evento. Ele permite que seus recepcionistas, seguranças ou colaboradores operem o leitor de check-in nos próprios celulares <strong>sem precisar saber a sua senha de acesso da conta principal</strong>!
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', background: '#ffffff', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #dbeafe' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#3b82f6', textTransform: 'uppercase', fontWeight: 700 }}>Onde encontrar o código</div>
                    <div style={{ fontSize: '0.88rem', color: '#1e293b', marginTop: '0.2rem' }}>No card do evento publicado em <strong>Meus Eventos</strong>.</div>
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#3b82f6', textTransform: 'uppercase', fontWeight: 700 }}>Link direto para a equipe</div>
                    <div style={{ fontSize: '0.88rem', color: '#1e293b', marginTop: '0.2rem' }}>Copie o link com <code style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>?code=SEU_CODIGO</code> e envie no WhatsApp da recepção!</div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: COMO ABRIR A PÁGINA DO CHECK-IN */}
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🌐</span> 3 Formas de Abrir o Terminal de Check-in
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.85rem' }}>
                  <div style={{ padding: '1.1rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#4f46e5', marginBottom: '0.3rem' }}>Opção A: Botão no Painel</div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      Acesse <strong>Meus Eventos</strong> e no card do evento desejado clique em <strong>&quot;Check-in / Terminal&quot;</strong>.
                    </p>
                  </div>

                  <div style={{ padding: '1.1rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0284c7', marginBottom: '0.3rem' }}>Opção B: URL Direta no Navegador</div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      Abra o navegador no celular e digite o endereço <code style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>/checkin</code> para abrir a tela de login por código.
                    </p>
                  </div>

                  <div style={{ padding: '1.1rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#16a34a', marginBottom: '0.3rem' }}>Opção C: Link Compartilhado</div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                      Envie o link do evento preenchido com a chave de liberação diretamente aos atendentes da portaria.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 3: PASSO A PASSO NO CELULAR */}
              <div style={{ padding: '1.25rem', borderRadius: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <h4 style={{ margin: '0 0 0.8rem', fontSize: '1rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📲</span> Passo a Passo de Uso pelo Celular
                </h4>

                <ol style={{ margin: 0, paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem', color: '#14532d' }}>
                  <li>
                    <strong>Abrir no Navegador do Celular:</strong> Use o Google Chrome (Android/iOS) ou Safari (iPhone).
                  </li>
                  <li>
                    <strong>Digitar o Código da Portaria:</strong> Insira o código PIN do evento e clique em <em>&quot;Entrar no Terminal&quot;</em>. A sessão ficará salva no celular durante todo o evento.
                  </li>
                  <li>
                    <strong>Conceder Permissão de Câmera:</strong> Quando o navegador perguntar <em>&quot;Deseja permitir o acesso à câmera?&quot;</em>, toque em <strong>Permitir</strong>.
                  </li>
                  <li>
                    <strong>Apontar para o QR Code:</strong> Posicione a câmera traseira do smartphone em frente ao QR Code do ingresso (seja impresso em papel ou na tela do celular do cliente).
                  </li>
                  <li>
                    <strong>Verificar a Resposta na Tela:</strong>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem' }}>
                        🟩 VERDE = Ingresso Válido (Vibração + Dados do Cliente)
                      </span>
                      <span style={{ background: '#fee2e2', color: '#991b1b', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem' }}>
                        🟥 VERMELHO = Já Lido ou Inválido
                      </span>
                    </div>
                  </li>
                  <li>
                    <strong>Participante sem bateria / Sem celular:</strong> Clique na opção <strong>&quot;Buscar por Nome ou CPF&quot;</strong> na parte inferior da câmera para realizar a baixa manual rápida.
                  </li>
                </ol>
              </div>

              {/* Status Indicator Demo */}
              <div style={{ padding: '1.25rem', borderRadius: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a' }}>
                <h4 style={{ margin: '0 0 0.6rem', fontSize: '0.95rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📊</span> Monitoramento de Entrada em Tempo Real
                </h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
                  Mesmo com múltiplos celulares lendo ingressos simultaneamente na portaria, o sistema sincroniza a entrada ao vivo, impedindo que um mesmo ingresso seja reutilizado em portas diferentes!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            padding: '1rem 1.75rem',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: currentIndex === 0 ? '#f1f5f9' : '#ffffff',
              color: currentIndex === 0 ? '#94a3b8' : '#334155',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            ← Passo Anterior
          </button>

          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
            Passo {currentIndex + 1} de {tabs.length}
          </div>

          {currentIndex < tabs.length - 1 ? (
            <button
              onClick={handleNext}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4338ca')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#4f46e5')}
            >
              Próximo Passo →
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#15803d')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#16a34a')}
            >
              Entendido! Fechar Manual ✓
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

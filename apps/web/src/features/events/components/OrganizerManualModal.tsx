'use client'

import React, { useEffect, useState } from 'react'
import { OrganizerFinancialGuide } from './OrganizerFinancialGuide'
import { BankAccountSetupModal } from './BankAccountSetupModal'

interface OrganizerManualModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: string
}

type TabType = 'criacao' | 'ingressos' | 'publicacao' | 'exclusao' | 'checkin' | 'financeiro'

export function OrganizerManualModal({ isOpen, onClose, initialTab = 'criacao' }: OrganizerManualModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>((initialTab as TabType) || 'criacao')
  const [isBankModalOpen, setIsBankModalOpen] = useState(false)

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab as TabType)
    }
  }, [isOpen, initialTab])

  if (!isOpen) return null

  const tabs: { id: TabType; label: string }[] = [
    { id: 'criacao', label: '1. Criação do Evento' },
    { id: 'ingressos', label: '2. Ingressos' },
    { id: 'publicacao', label: '3. Solicitar Publicação' },
    { id: 'exclusao', label: '4. Solicitar Exclusão' },
    { id: 'checkin', label: '5. Validação & Check-in' },
    { id: 'financeiro', label: '6. Financeiro & Repasses' },
  ]

  const tabKeys: TabType[] = ['criacao', 'ingressos', 'publicacao', 'exclusao', 'checkin', 'financeiro']
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
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
          maxWidth: '920px',
          maxHeight: '90vh',
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
        {/* Modal Header Limpo e Profissional (Executive Dark) */}
        <div
          style={{
            background: 'linear-gradient(135deg, #070a13 0%, #0f172a 100%)',
            color: '#ffffff',
            padding: '1.35rem 1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f8fafc', background: '#1e293b', padding: '0.2rem 0.6rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.06em', border: '1px solid #334155' }}>
              Documentação Oficial
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.35rem 0 0', color: '#ffffff', letterSpacing: '-0.02em' }}>
              Manual de Gestão & Operações MyPass360
            </h2>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#94a3b8',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#334155'
              e.currentTarget.style.color = '#ffffff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#1e293b'
              e.currentTarget.style.color = '#94a3b8'
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
            gap: '0.35rem',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            padding: '0.65rem 1.25rem',
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
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  border: isActive ? '1px solid #0f172a' : '1px solid transparent',
                  background: isActive ? '#0f172a' : 'transparent',
                  color: isActive ? '#ffffff' : '#475569',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
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
            padding: '1.5rem 1.75rem',
            color: '#1e293b',
            lineHeight: 1.6,
          }}
        >
          {/* TAB 1: CRIAÇÃO DO EVENTO */}
          {activeTab === 'criacao' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.4rem', color: '#0f172a' }}>
                  Como criar um evento no MyPass360
                </h3>
                <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0 }}>
                  Estruture seu evento com título, descrição, imagens, datas e tipo de acesso.
                </p>
              </div>

              {/* Destaque Importante: OBRIGATORIEDADE DE PUBLICAÇÃO */}
              <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', padding: '1rem 1.15rem', color: '#ffffff' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#38bdf8', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Aviso Obrigatório de Publicação
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                  Ao salvar o formulário de cadastro, seu evento é criado como <strong>Rascunho</strong>. Para que o evento fique visível ao público e seus participantes possam comprar/reservar ingressos, ele <strong>PRECISA SER ENVIADO PARA ANÁLISE E PUBLICADO</strong>.
                </p>
              </div>

              {/* Passos de Cadastro */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1.1rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>Etapa 1</span>
                  <h4 style={{ margin: '0.3rem 0 0.4rem', fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>Informações Gerais</h4>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    Preencha o título do evento, descrição detalhada, categoria e envie o banner promocional no formato 16:9.
                  </p>
                </div>

                <div style={{ padding: '1.1rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>Etapa 2</span>
                  <h4 style={{ margin: '0.3rem 0 0.4rem', fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>Tipo e Visibilidade</h4>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    Defina se o evento será <strong>Pago</strong> ou <strong>Gratuito</strong>, e escolha a visibilidade: <strong>Pública</strong> (vitrine) ou <strong>Privada</strong> (apenas link direto).
                  </p>
                </div>

                <div style={{ padding: '1.1rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>Etapa 3</span>
                  <h4 style={{ margin: '0.3rem 0 0.4rem', fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>Solicitar Publicação</h4>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    Após revisar, clique em <strong>“Solicitar Publicação”</strong> para que a administração analise e libere a divulgação oficial.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INGRESSOS */}
          {activeTab === 'ingressos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.4rem', color: '#0f172a' }}>
                  Gerenciando Ingressos do Evento
                </h3>
                <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0 }}>
                  Cadastre as categorias de ingressos disponíveis com preços unitários e quantidades específicas para os participantes.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1.1rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <span style={{ background: '#f1f5f9', color: '#0f172a', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                    INGRESSO GRATUITO
                  </span>
                  <h4 style={{ margin: '0.5rem 0 0.3rem', fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>Confirmação de Presença / VIP</h4>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    Indicado para reuniões, palestras abertas e festas fechadas. O participante confirma presença informando nome e CPF sem passar por checkout de pagamento.
                  </p>
                </div>

                <div style={{ padding: '1.1rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
                  <span style={{ background: '#0f172a', color: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                    INGRESSO PAGO
                  </span>
                  <h4 style={{ margin: '0.5rem 0 0.3rem', fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>Venda por Categoria Unitária</h4>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    Cadastre cada tipo de ingresso (ex: Pista, Camarote, Meia-entrada) informando o valor unitário individual em R$ e o limite de quantidade de vagas disponíveis.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SOLICITAR PUBLICAÇÃO */}
          {activeTab === 'publicacao' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.4rem', color: '#0f172a' }}>
                  Fluxo de Aprovação e Publicação
                </h3>
                <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0 }}>
                  Todos os eventos passam por validação administrativa para garantir a integridade da plataforma.
                </p>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1.1rem' }}>
                <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.88rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <li>Você clica em <strong>“Solicitar Publicação”</strong> no card do evento.</li>
                  <li>A equipe de análise revisa os dados cadastrais e ingressos.</li>
                  <li>Após a aprovação, o botão <strong>“Publicar”</strong> é liberado no seu painel para você colocar o evento no ar no momento desejado.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 4: SOLICITAR EXCLUSÃO */}
          {activeTab === 'exclusao' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.4rem', color: '#0f172a' }}>
                  Regras de Exclusão de Eventos
                </h3>
                <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0 }}>
                  Para eventos que já foram aprovados ou que possuem ingressos emitidos, a exclusão exige análise da equipe.
                </p>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '1.1rem', fontSize: '0.88rem', color: '#334155' }}>
                Clique em <strong>“Solicitar Exclusão”</strong> e informe o motivo do cancelamento. Caso haja compradores atrelados, nossa equipe orientará sobre o procedimento de segurança.
              </div>
            </div>
          )}

          {/* TAB 5: VALIDAÇÃO & CHECK-IN */}
          {activeTab === 'checkin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f8fafc', background: '#0f172a', padding: '0.2rem 0.65rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Operação de Campo & Portaria
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0.4rem 0 0.25rem', color: '#0f172a' }}>
                  Guia Detalhado de Ativação e Check-in na Entrada
                </h3>
                <p style={{ color: '#475569', fontSize: '0.88rem', margin: 0, lineHeight: 1.45 }}>
                  Siga os 6 passos abaixo para preparar seus terminais de recepção, liberar a equipe de operadores e fazer a leitura de ingressos em tempo real.
                </p>
              </div>

              {/* 6 Passos Detalhados de Operação da Portaria */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Passo 1 */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0f172a', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      1
                    </div>
                    <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#0f172a' }}>
                      Ativar a Portaria do Evento
                    </h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', paddingLeft: '2.4rem', lineHeight: 1.5 }}>
                    No seu painel em <strong>“Meus Eventos”</strong>, acesse as opções do card do evento desejado e ative a chave <strong>“Portaria Aberta / Ativa”</strong>. Isso libera o servidor de checagem ao vivo.
                  </p>
                </div>

                {/* Passo 2 */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0f172a', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      2
                    </div>
                    <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#0f172a' }}>
                      Criar o Código de Acesso do Operador (PIN)
                    </h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', paddingLeft: '2.4rem', lineHeight: 1.5 }}>
                    Crie um <strong>Código de 6 dígitos</strong> (ex: <code>739201</code>) na aba de configurações da Portaria. Esse código servirá como senha temporária para os recepcionistas, protegendo seus dados financeiros administrativos.
                  </p>
                </div>

                {/* Passo 3 */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0f172a', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      3
                    </div>
                    <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#0f172a' }}>
                      Gerar e Copiar o Link da Portaria
                    </h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', paddingLeft: '2.4rem', lineHeight: 1.5 }}>
                    Clique no botão <strong>“Gerar Link da Portaria”</strong> e copie o endereço de acesso. Compartilhe esse link diretamente via WhatsApp ou e-mail com a equipe encarregada da recepção.
                  </p>
                </div>

                {/* Passo 4 */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0f172a', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      4
                    </div>
                    <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#0f172a' }}>
                      Abrir o Link em Qualquer Dispositivo
                    </h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', paddingLeft: '2.4rem', lineHeight: 1.5 }}>
                    O recepcionista abre a URL no navegador de qualquer <strong>Smartphone (Android/iOS), Tablet ou Computador</strong> na entrada do evento. Não requer download de aplicativo na loja.
                  </p>
                </div>

                {/* Passo 5 */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0f172a', color: '#ffffff', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      5
                    </div>
                    <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#0f172a' }}>
                      Inserir o Código do Operador na Tela de Login
                    </h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', paddingLeft: '2.4rem', lineHeight: 1.5 }}>
                    Na tela de acesso da portaria, o operador insere o <strong>Código de 6 dígitos</strong> criado no Passo 2. Ao confirmar, o leitor de ingressos é ativado imediatamente no dispositivo.
                  </p>
                </div>

                {/* Passo 6 */}
                <div style={{ background: 'linear-gradient(135deg, #070a13 0%, #0f172a 100%)', border: '1px solid #1e293b', borderRadius: '12px', padding: '1.1rem 1.25rem', color: '#ffffff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#ffffff', color: '#070a13', fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      6
                    </div>
                    <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#ffffff' }}>
                      Fazer a Leitura do QR Code ou Busca por Nome / CPF
                    </h4>
                  </div>
                  <div style={{ paddingLeft: '2.4rem', fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div>
                      <strong>Leitura de QR Code:</strong> Aponte a câmera do dispositivo para o código no celular ou papel impresso do participante. O sistema responde instantaneamente com feedback sonoro e tela verde <em>(Válido)</em> ou vermelha <em>(Já Utilizado/Inválido)</em>.
                    </div>
                    <div>
                      <strong>Busca por Nome / CPF:</strong> Se o participante estiver sem bateria ou celular, o operador digita o <strong>Nome Completo</strong> ou <strong>CPF</strong> no campo de busca para validar a entrada com apenas 1 toque.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: FINANCEIRO & REPASSES */}
          {activeTab === 'financeiro' && (
            <OrganizerFinancialGuide onOpenBankAccountModal={() => setIsBankModalOpen(true)} />
          )}
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            padding: '1rem 1.75rem',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
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
              padding: '0.55rem 1.1rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: currentIndex === 0 ? '#f1f5f9' : '#ffffff',
              color: currentIndex === 0 ? '#94a3b8' : '#334155',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            ← Passo Anterior
          </button>

          <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
            Passo {currentIndex + 1} de {tabs.length}
          </div>

          {currentIndex < tabs.length - 1 ? (
            <button
              onClick={handleNext}
              style={{
                padding: '0.55rem 1.15rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
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
                padding: '0.55rem 1.15rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#059669',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#047857')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#059669')}
            >
              Concluir e Fechar ✓
            </button>
          )}
        </div>
      </div>

      {/* Modal da Conta Bancária */}
      <BankAccountSetupModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
      />
    </div>
  )
}

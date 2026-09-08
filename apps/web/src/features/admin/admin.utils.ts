import type { ApprovalStatus, DeletionStatus, EventStatus } from '@mypass360/types'
import type { AdminSection } from './admin.types'

export const eventStatusOptions: EventStatus[] = ['draft', 'published', 'cancelled', 'finished']

export const eventStatusLabels: Record<EventStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  cancelled: 'Cancelado',
  finished: 'Encerrado',
}

export const approvalStatusLabels: Record<ApprovalStatus, string> = {
  none: 'Sem aprovação',
  pending: 'Aguardando aprovação',
  approved: 'Aprovado',
  rejected: 'Reprovado',
}

export const approvalStatusColors: Record<ApprovalStatus, string> = {
  none: '#64748b',
  pending: '#d97706',
  approved: '#16a34a',
  rejected: '#dc2626',
}

export const deletionStatusLabels: Record<DeletionStatus, string> = {
  none: 'Sem solicitação',
  pending: 'Exclusão em análise',
  approved: 'Exclusão aprovada',
  rejected: 'Exclusão mantida',
}

export const deletionStatusColors: Record<DeletionStatus, string> = {
  none: '#64748b',
  pending: '#dc2626',
  approved: '#64748b',
  rejected: '#16a34a',
}

const validSections: AdminSection[] = ['painel', 'indicadores', 'eventos', 'usuarios', 'aprovacoes', 'publicacoes', 'exclusoes', 'mensagens']


export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(value: string | null): string {
  if (!value) return '—'

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function getEventStatusLabel(status: EventStatus): string {
  return eventStatusLabels[status]
}

export function statusColor(status: EventStatus): string {
  switch (status) {
    case 'published':
      return '#16a34a'
    case 'draft':
      return '#f59e0b'
    case 'cancelled':
      return '#dc2626'
    case 'finished':
      return '#6366f1'
    default:
      return '#64748b'
  }
}

export function getAdminSection(value: string | null): AdminSection {
  if (!value) {
    return 'painel'
  }

  return validSections.includes(value as AdminSection) ? (value as AdminSection) : 'painel'
}

import type { EventStatus } from '@mypass360/types'
import type { AdminSection } from './admin.types'

export const eventStatusOptions: EventStatus[] = ['draft', 'published', 'cancelled', 'finished']

export const eventStatusLabels: Record<EventStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  cancelled: 'Cancelado',
  finished: 'Encerrado',
}

const validSections: AdminSection[] = ['painel', 'indicadores', 'eventos', 'usuarios']

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

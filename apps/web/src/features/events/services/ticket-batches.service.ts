import { api, apiWithAuth } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

async function getAuthToken(): Promise<string> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Sessão expirada. Faça login novamente.')
  return session.access_token
}

export type BatchStatus = 'future' | 'open' | 'sold_out' | 'closed'

export interface TicketBatch {
  id: string
  ticket_type_id: string
  name: string
  price: number
  quantity: number
  is_unlimited: boolean
  display_order: number
  status: BatchStatus
  sold: number
  reserved: number
  created_at: string
  updated_at: string
}

export interface ActiveBatchInfo {
  batchId: string
  price: number
  availableQty: number | null
}

export interface CreateBatchInput {
  name: string
  price: number
  quantity: number
  is_unlimited?: boolean
  display_order?: number
}

export interface UpdateBatchInput {
  name?: string
  price?: number
  quantity?: number
  is_unlimited?: boolean
  status?: BatchStatus
}

// ─── Leitura (público) ────────────────────────────────────────────────────────

export async function fetchBatches(eventId: string, ticketTypeId: string): Promise<TicketBatch[]> {
  return api.get<TicketBatch[]>(`/events/${eventId}/ticket-types/${ticketTypeId}/batches`)
}

export async function fetchActiveBatch(
  eventId: string,
  ticketTypeId: string
): Promise<ActiveBatchInfo | null> {
  return api.get<ActiveBatchInfo | null>(
    `/events/${eventId}/ticket-types/${ticketTypeId}/batches/active`
  )
}

export async function fetchEventBatches(eventId: string): Promise<TicketBatch[]> {
  const token = await getAuthToken()
  return apiWithAuth(token).get<TicketBatch[]>(`/events/${eventId}/batches`)
}

// ─── Escrita (organizador) ────────────────────────────────────────────────────

export async function createBatch(
  eventId: string,
  ticketTypeId: string,
  input: CreateBatchInput
): Promise<TicketBatch> {
  const token = await getAuthToken()
  return apiWithAuth(token).post<TicketBatch>(`/events/${eventId}/ticket-types/${ticketTypeId}/batches`, input)
}

export async function updateBatch(
  batchId: string,
  input: UpdateBatchInput
): Promise<TicketBatch> {
  const token = await getAuthToken()
  return apiWithAuth(token).patch<TicketBatch>(`/ticket-batches/${batchId}`, input)
}

export async function closeBatch(batchId: string): Promise<TicketBatch> {
  const token = await getAuthToken()
  return apiWithAuth(token).patch<TicketBatch>(`/ticket-batches/${batchId}/close`, {})
}

export async function deleteBatch(batchId: string): Promise<void> {
  const token = await getAuthToken()
  return apiWithAuth(token).delete<void>(`/ticket-batches/${batchId}`)
}

export async function setBatchMode(
  eventId: string,
  ticketTypeId: string,
  enabled: boolean
): Promise<{ success: boolean; enabled: boolean }> {
  const token = await getAuthToken()
  return apiWithAuth(token).patch(`/events/${eventId}/ticket-types/${ticketTypeId}/batch-mode`, { enabled })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  future: 'Futuro',
  open: 'Em venda',
  sold_out: 'Esgotado',
  closed: 'Encerrado',
}

export const BATCH_STATUS_COLORS: Record<BatchStatus, { bg: string; color: string; border: string }> = {
  future: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
  open: { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  sold_out: { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  closed: { bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' },
}

export function formatBatchPrice(price: number): string {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function getBatchAvailable(batch: TicketBatch): number | null {
  if (batch.is_unlimited) return null
  return Math.max(0, batch.quantity - batch.sold - batch.reserved)
}

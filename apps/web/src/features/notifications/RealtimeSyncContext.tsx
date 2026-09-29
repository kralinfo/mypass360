'use client'

/**
 * RealtimeSyncContext — MyPass360
 *
 * Context central de sincronização em tempo real.
 *
 * Problema resolvido: notificações chegavam via Supabase Realtime e atualizavam
 * o sino/badge, mas os dados exibidos na tela permaneciam desatualizados porque
 * nenhum refetch era disparado após a chegada de uma notificação.
 *
 * Solução: este context funciona como um Event Bus. Cada tela/hook se registra
 * como "handler" de determinados tipos de dado. Quando `triggerSync()` é chamado
 * (pelo useNotifications ao receber uma nova notificação), os handlers relevantes
 * são disparados, fazendo refetch seletivo apenas dos dados necessários.
 *
 * Fluxo:
 *   Notification INSERT (Supabase Realtime)
 *     → useNotifications detecta via postgres_changes
 *     → chama triggerSync(notificationType, entityId)
 *     → RealtimeSyncContext identifica handlers registrados
 *     → cada handler faz refetch do dado que controla
 *     → UI atualiza sem reload de página
 */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from 'react'
import type { NotificationType } from '@mypass360/types'

// ── Tipos públicos ────────────────────────────────────────────────────────────

export type SyncHandler = (entityId?: string | null) => void

/**
 * Quais grupos de dado podem ser sincronizados.
 * Extensível: adicione novos targets aqui conforme necessário.
 */
export type SyncTarget =
  | 'my_events'          // Lista de eventos do organizador (useMyEvents)
  | 'public_events'      // Lista pública de eventos (useSupabaseEvents)
  | 'admin_dashboard'    // Dashboard geral do admin (useAdminDashboard)
  | 'admin_publications' // Fila de publicações (AdminPublicationsTabContainer)
  | 'admin_deletions'    // Fila de exclusões (AdminDeletionsTabContainer)
  | 'admin_messages'     // Seção de mensagens admin

export interface RealtimeSyncContextValue {
  registerHandler: (target: SyncTarget, key: string, handler: SyncHandler) => () => void
  triggerSync: (type: NotificationType, entityId?: string | null) => void
}

// ── Mapeamento Notificação → Targets ─────────────────────────────────────────

/**
 * Fonte de verdade central: define quais dados devem ser sincronizados
 * para cada tipo de notificação recebida.
 *
 * Extensível: adicione novos tipos de notificação simplesmente adicionando
 * uma entrada aqui. Nenhum outro arquivo precisa ser alterado.
 */
const NOTIFICATION_SYNC_MAP: Record<string, SyncTarget[]> = {
  // ── Sincronização em tempo real (Organizador, Público e Admin) ──
  event_approved:           ['my_events', 'public_events', 'admin_dashboard', 'admin_publications'],
  event_rejected:           ['my_events', 'public_events', 'admin_dashboard', 'admin_publications'],
  event_published:          ['my_events', 'public_events', 'admin_dashboard'],
  event_deletion_approved:  ['my_events', 'public_events', 'admin_dashboard', 'admin_deletions'],
  event_deletion_rejected:  ['my_events', 'public_events', 'admin_dashboard', 'admin_deletions'],
  event_deleted_by_admin:   ['my_events', 'public_events', 'admin_dashboard'],
  admin_message:            ['my_events', 'public_events', 'admin_dashboard'],
  order_paid:               ['my_events', 'admin_dashboard'],

  // ── Admin recebe → atualiza painéis relevantes ──
  event_approval_requested: ['admin_publications', 'admin_dashboard'],
  event_approval_cancelled: ['admin_publications', 'admin_dashboard'],
  event_deletion_requested: ['admin_deletions', 'admin_dashboard'],
  organizer_reply:          ['admin_messages'],

  // ── Sem sincronização necessária ──
  checkin_completed:        [],
  system_announcement:      [],
}

// ── Context (exportado com _ para uso interno apenas em useRealtimeSyncHandler) ──

/**
 * @internal — Use `useRealtimeSync()` publicamente.
 * Exportado separadamente para que `useRealtimeSyncHandler` possa acessar
 * o contexto sem chamar o hook que lança erro fora do Provider.
 */
export const _RealtimeSyncContext = createContext<RealtimeSyncContextValue | null>(null)

// ── Provider ─────────────────────────────────────────────────────────────────

export function RealtimeSyncProvider({ children }: { children: ReactNode }) {
  /**
   * Registry: Map<SyncTarget, Map<key, SyncHandler>>
   * useRef evita re-renders ao registrar/desregistrar handlers.
   * O Map permite múltiplos handlers para o mesmo target (ex: duas instâncias de useMyEvents).
   */
  const handlersRef = useRef<Map<SyncTarget, Map<string, SyncHandler>>>(new Map())

  const registerHandler = useCallback(
    (target: SyncTarget, key: string, handler: SyncHandler): (() => void) => {
      const registry = handlersRef.current

      if (!registry.has(target)) {
        registry.set(target, new Map())
      }
      registry.get(target)!.set(key, handler)

      // Cleanup automático: remove o handler ao desmontar o componente
      return () => {
        registry.get(target)?.delete(key)
      }
    },
    []
  )

  const triggerSync = useCallback(
    (type: NotificationType, entityId?: string | null) => {
      const targets = NOTIFICATION_SYNC_MAP[type as string]
      if (!targets || targets.length === 0) return

      const registry = handlersRef.current

      for (const target of targets) {
        const handlers = registry.get(target)
        if (!handlers || handlers.size === 0) continue

        for (const [, handler] of handlers) {
          try {
            handler(entityId)
          } catch (err) {
            console.error(
              `[RealtimeSyncContext] Erro ao executar handler para target "${target}":`,
              err
            )
          }
        }
      }
    },
    []
  )

  return (
    <_RealtimeSyncContext.Provider value={{ registerHandler, triggerSync }}>
      {children}
    </_RealtimeSyncContext.Provider>
  )
}

// ── Hook público ──────────────────────────────────────────────────────────────

/**
 * Retorna as funções do RealtimeSyncContext.
 * Lança erro se usado fora do RealtimeSyncProvider.
 */
export function useRealtimeSync(): RealtimeSyncContextValue {
  const ctx = useContext(_RealtimeSyncContext)
  if (!ctx) {
    throw new Error('[useRealtimeSync] Deve ser usado dentro de <RealtimeSyncProvider>')
  }
  return ctx
}

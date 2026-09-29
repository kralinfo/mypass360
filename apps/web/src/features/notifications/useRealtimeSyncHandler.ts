'use client'

/**
 * useRealtimeSyncHandler — MyPass360
 *
 * Hook auxiliar que registra um handler de sincronização no RealtimeSyncContext
 * e garante limpeza automática quando o componente é desmontado.
 *
 * O handler recebe o entityId da notificação (ex: eventId) para casos em que
 * é preciso atualizar apenas um item específico da lista.
 *
 * Uso:
 * ```ts
 * useRealtimeSyncHandler('my_events', 'useMyEvents-instance', () => void load())
 * ```
 */

import { useContext, useEffect } from 'react'
import { _RealtimeSyncContext } from './RealtimeSyncContext'
import type { SyncHandler, SyncTarget } from './RealtimeSyncContext'

export function useRealtimeSyncHandler(
  target: SyncTarget,
  key: string,
  handler: SyncHandler
) {
  // Usa useContext diretamente (sem useRealtimeSync que lança erro)
  // para falhar silenciosamente fora do provider (ex: testes/Storybook)
  const ctx = useContext(_RealtimeSyncContext)

  useEffect(() => {
    if (!ctx) return

    const unregister = ctx.registerHandler(target, key, handler)
    return unregister
    // handler intencionalmente omitido das deps — o registry usa a ref do contexto.
    // Re-registrar a cada render causaria limpeza/registro contínuo sem benefício.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, target, key])
}

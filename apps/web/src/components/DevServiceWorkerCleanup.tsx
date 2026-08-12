'use client'

import { useEffect } from 'react'

/**
 * Em desenvolvimento o service worker do PWA fica desabilitado (ver next.config.ts),
 * mas um registro antigo (de uma build de produção testada localmente) pode continuar
 * ativo no navegador e servir chunks/CSS desatualizados após cada rebuild, quebrando a página.
 * Este componente garante que nenhum service worker fique ativo durante o dev.
 */
export function DevServiceWorkerCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister())
    })

    if (typeof caches !== 'undefined') {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)))
    }
  }, [])

  return null
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Notification } from '@mypass360/types'
import { createClient } from '@/lib/supabase/client'
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from './notifications.service'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)

  // 1. Obter sessão atual
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && session.access_token) {
        setUserId(session.user.id)
        setToken(session.access_token)
      } else {
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && session.access_token) {
        setUserId(session.user.id)
        setToken(session.access_token)
      } else {
        setUserId(null)
        setToken(null)
        setNotifications([])
        setUnreadCount(0)
        setIsLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 2. Carregar notificações iniciais via REST API
  const loadNotifications = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchNotifications(token)
      setNotifications(data)
      setUnreadCount(data.filter((n) => !n.read).length)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar notificações.')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      void loadNotifications()
    }
  }, [token, loadNotifications])

  // 3. Subscrição em Tempo Real com Supabase Realtime (Postgres Changes)
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const channelName = `notif-${userId}-${Math.random().toString(36).substring(2, 8)}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification
          setNotifications((prev) => [newNotif, ...prev.filter((n) => n.id !== newNotif.id)])
          if (!newNotif.read) {
            setUnreadCount((prev) => prev + 1)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updatedNotif = payload.new as Notification
          setNotifications((prev) => {
            const nextList = prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n))
            setUnreadCount(nextList.filter((n) => !n.read).length)
            return nextList
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId])

  // 4. Ações
  const markAsRead = useCallback(
    async (id: string) => {
      if (!token) return
      // Otimista
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))

      try {
        await markNotificationAsRead(id, token)
      } catch {
        // Se falhar, recarrega
        void loadNotifications()
      }
    },
    [token, loadNotifications]
  )

  const markAllAsRead = useCallback(async () => {
    if (!token) return
    // Otimista
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() }))
    )
    setUnreadCount(0)

    try {
      await markAllNotificationsAsRead(token)
    } catch {
      void loadNotifications()
    }
  }, [token, loadNotifications])

  const clearAll = useCallback(async () => {
    if (!token) return
    // Otimista
    setNotifications([])
    setUnreadCount(0)

    try {
      const { clearAllNotifications } = await import('./notifications.service')
      await clearAllNotifications(token)
    } catch {
      void loadNotifications()
    }
  }, [token, loadNotifications])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh: loadNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
  }
}

'use client'

import {
  deleteAdminEvent,
  deleteAdminUser,
  fetchAdminDashboard,
  updateAdminEventStatus,
  updateAdminUserStatus,
} from '@/features/admin/admin.service'
import type { AdminDashboardData, AdminEventItem, AdminUserItem, EventStatus } from '@mypass360/types'
import { useCallback, useEffect, useState } from 'react'

type AdminDashboardState = {
  dashboard: AdminDashboardData | null
  isLoading: boolean
  error: string | null
  runningAction: string | null
  loadDashboard: () => Promise<void>
  handleEventStatusChange: (event: AdminEventItem, status: EventStatus) => Promise<void>
  handleEventDelete: (event: AdminEventItem) => Promise<void>
  handleUserToggle: (user: AdminUserItem) => Promise<void>
  handleUserDelete: (user: AdminUserItem) => Promise<void>
}

export function useAdminDashboard(): AdminDashboardState {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runningAction, setRunningAction] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchAdminDashboard()
      setDashboard(data)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o painel.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const handleEventStatusChange = useCallback(async (event: AdminEventItem, status: EventStatus) => {
    const actionKey = `event-status-${event.id}`
    setRunningAction(actionKey)

    try {
      await updateAdminEventStatus(event.id, status)
      await loadDashboard()
    } catch (actionError) {
      alert(actionError instanceof Error ? actionError.message : 'Erro ao atualizar evento.')
    } finally {
      setRunningAction(null)
    }
  }, [loadDashboard])

  const handleEventDelete = useCallback(async (event: AdminEventItem) => {
    if (!window.confirm(`Remover o evento "${event.title}"?`)) {
      return
    }

    const actionKey = `event-delete-${event.id}`
    setRunningAction(actionKey)

    try {
      await deleteAdminEvent(event.id)
      await loadDashboard()
    } catch (actionError) {
      alert(actionError instanceof Error ? actionError.message : 'Erro ao remover evento.')
    } finally {
      setRunningAction(null)
    }
  }, [loadDashboard])

  const handleUserToggle = useCallback(async (user: AdminUserItem) => {
    const actionKey = `user-toggle-${user.id}`
    setRunningAction(actionKey)

    try {
      await updateAdminUserStatus(user.id, !user.disabled)
      await loadDashboard()
    } catch (actionError) {
      alert(actionError instanceof Error ? actionError.message : 'Erro ao atualizar usuário.')
    } finally {
      setRunningAction(null)
    }
  }, [loadDashboard])

  const handleUserDelete = useCallback(async (user: AdminUserItem) => {
    if (!window.confirm(`Excluir o usuário ${user.email}? Essa ação é irreversível.`)) {
      return
    }

    const actionKey = `user-delete-${user.id}`
    setRunningAction(actionKey)

    try {
      await deleteAdminUser(user.id)
      await loadDashboard()
    } catch (actionError) {
      alert(actionError instanceof Error ? actionError.message : 'Erro ao excluir usuário.')
    } finally {
      setRunningAction(null)
    }
  }, [loadDashboard])

  return {
    dashboard,
    isLoading,
    error,
    runningAction,
    loadDashboard,
    handleEventStatusChange,
    handleEventDelete,
    handleUserToggle,
    handleUserDelete,
  }
}

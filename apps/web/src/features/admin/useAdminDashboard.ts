'use client'

import {
  deleteAdminEvent,
  deleteAdminUser,
  fetchAdminDashboard,
  updateAdminEventStatus,
  updateAdminUserStatus,
  sendPendingReminders,
} from '@/features/admin/admin.service'
import type { AdminDashboardData, AdminEventItem, AdminUserItem, EventStatus } from '@mypass360/types'
import type { ReminderModalState } from './components/ReminderModal'
import { useCallback, useEffect, useState } from 'react'

type ReminderModalData = {
  event: AdminEventItem
  state: ReminderModalState
  sentCount?: number
  errorMessage?: string
}

type AdminDashboardState = {
  dashboard: AdminDashboardData | null
  isLoading: boolean
  error: string | null
  runningAction: string | null
  reminderModal: ReminderModalData | null
  loadDashboard: () => Promise<void>
  handleEventStatusChange: (event: AdminEventItem, status: EventStatus) => Promise<void>
  handleEventDelete: (event: AdminEventItem) => Promise<void>
  handleUserToggle: (user: AdminUserItem) => Promise<void>
  handleUserDelete: (user: AdminUserItem) => Promise<void>
  handleSendPendingReminders: (event: AdminEventItem) => void
  handleReminderConfirm: () => Promise<void>
  handleReminderClose: () => void
}

export function useAdminDashboard(): AdminDashboardState {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [runningAction, setRunningAction] = useState<string | null>(null)
  const [reminderModal, setReminderModal] = useState<ReminderModalData | null>(null)

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

  const handleEventDelete = useCallback(async (event: AdminEventItem, reason?: string) => {
    const actionKey = `event-delete-${event.id}`
    setRunningAction(actionKey)

    try {
      await deleteAdminEvent(event.id, reason)
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

  // Abre o modal na fase de confirmação
  const handleSendPendingReminders = useCallback((event: AdminEventItem) => {
    const pendingCount = event.totalOrders - event.paidOrders
    if (pendingCount <= 0) return
    setReminderModal({ event, state: 'confirm' })
  }, [])

  // Usuário confirmou → dispara o envio
  const handleReminderConfirm = useCallback(async () => {
    if (!reminderModal) return

    const { event } = reminderModal

    setReminderModal((prev) => prev ? { ...prev, state: 'loading' } : null)

    try {
      const res = await sendPendingReminders(event.id)
      setReminderModal((prev) => prev ? { ...prev, state: 'success', sentCount: res.sentCount } : null)
      // Recarrega o dashboard em background após sucesso
      void loadDashboard()
    } catch (actionError) {
      setReminderModal((prev) =>
        prev
          ? {
              ...prev,
              state: 'error',
              errorMessage: actionError instanceof Error ? actionError.message : 'Erro ao enviar lembretes.',
            }
          : null
      )
    }
  }, [reminderModal, loadDashboard])

  // Fecha/limpa o modal
  const handleReminderClose = useCallback(() => {
    setReminderModal(null)
  }, [])

  return {
    dashboard,
    isLoading,
    error,
    runningAction,
    reminderModal,
    loadDashboard,
    handleEventStatusChange,
    handleEventDelete,
    handleUserToggle,
    handleUserDelete,
    handleSendPendingReminders,
    handleReminderConfirm,
    handleReminderClose,
  }
}



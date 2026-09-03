import { Injectable } from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'
import { ConfigService } from '@nestjs/config'
import type { Notification } from '@mypass360/types'
import type { CreateNotificationBackendDto } from './dto/create-notification-backend.dto'

@Injectable()
export class NotificationsRepository {
  private readonly table = 'notifications'

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService
  ) {}

  /**
   * Cria uma notificação para um único usuário.
   */
  async create(dto: CreateNotificationBackendDto): Promise<Notification> {
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .insert({
        user_id: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        entity_type: dto.entityType ?? null,
        entity_id: dto.entityId ?? null,
        action_url: dto.actionUrl ?? null,
        metadata: dto.metadata ?? {},
      })
      .select('*')
      .single()

    if (error) {
      throw new Error(`Erro ao criar notificação: ${error.message}`)
    }

    return data as Notification
  }

  /**
   * Cria notificações para todos os administradores cadastrados no sistema.
   * Filtra por ADMIN_EMAILS ou por role 'admin'/'superadmin' no user_metadata.
   */
  async createForAdmins(
    dto: Omit<CreateNotificationBackendDto, 'userId'>
  ): Promise<Notification[]> {
    const client = this.supabase.getClient()

    // 1. Buscar todos os usuários via Supabase Auth Admin
    const { data: usersData, error: usersError } = await client.auth.admin.listUsers()
    if (usersError || !usersData?.users) {
      console.warn('[NotificationsRepository] Não foi possível listar usuários admin:', usersError)
      return []
    }

    // 2. Identificar quais usuários são administradores
    const rawAdminConfig = this.config.get<string>('ADMIN_EMAILS') ?? ''
    const adminEmailsConfig = (rawAdminConfig.trim() ? rawAdminConfig : 'admin@mypass360.com')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    const adminUserIds = usersData.users
      .filter((user) => {
        const email = (user.email ?? '').toLowerCase()
        const role = (user.user_metadata?.role as string | undefined)?.toLowerCase()
        const appRole = (user.app_metadata?.role as string | undefined)?.toLowerCase()

        const isAdminByEmail = adminEmailsConfig.includes(email)
        const isAdminByRole =
          role === 'admin' ||
          role === 'superadmin' ||
          appRole === 'admin' ||
          appRole === 'superadmin' ||
          user.user_metadata?.is_admin === true

        return isAdminByEmail || isAdminByRole
      })
      .map((user) => user.id)

    if (adminUserIds.length === 0) {
      return []
    }

    // 3. Criar em lote uma notificação para cada administrador
    const payload = adminUserIds.map((adminId) => ({
      user_id: adminId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      entity_type: dto.entityType ?? null,
      entity_id: dto.entityId ?? null,
      action_url: dto.actionUrl ?? null,
      metadata: dto.metadata ?? {},
    }))

    const { data, error } = await client
      .from(this.table)
      .insert(payload)
      .select('*')

    if (error) {
      console.error('[NotificationsRepository] Erro ao criar notificações para admins:', error)
      throw new Error(`Erro ao notificar administradores: ${error.message}`)
    }

    return (data ?? []) as Notification[]
  }

  /**
   * Busca notificações de um usuário específico, ordenadas das mais recentes para as mais antigas.
   */
  async findByUser(userId: string, limit = 50): Promise<Notification[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw new Error(`Erro ao buscar notificações: ${error.message}`)
    }

    return (data ?? []) as Notification[]
  }

  /**
   * Retorna a contagem de notificações não lidas de um usuário.
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .getClient()
      .from(this.table)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) {
      throw new Error(`Erro ao contar notificações não lidas: ${error.message}`)
    }

    return count ?? 0
  }

  /**
   * Marca uma notificação específica como lida.
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single()

    if (error) {
      throw new Error(`Erro ao marcar notificação como lida: ${error.message}`)
    }

    return data as Notification
  }

  /**
   * Marca todas as notificações de um usuário como lidas.
   */
  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('read', false)
      .select('id')

    if (error) {
      throw new Error(`Erro ao marcar todas as notificações como lidas: ${error.message}`)
    }

    return { updatedCount: data?.length ?? 0 }
  }

  /**
   * Exclui todas as notificações de um usuário.
   */
  async clearAll(userId: string): Promise<{ success: boolean }> {
    const { error } = await this.supabase
      .getClient()
      .from(this.table)
      .delete()
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Erro ao limpar notificações: ${error.message}`)
    }

    return { success: true }
  }
}

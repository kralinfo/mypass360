import { Injectable } from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'

@Injectable()
export class EventMembersRepository {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Procura usuário no Supabase Auth por e-mail (usando Admin API)
   */
  async findUserByEmail(email: string): Promise<{ id: string; email: string; name?: string } | null> {
    const normalizedEmail = email.trim().toLowerCase()
    const client = this.supabase.getClient()

    const { data, error } = await client.auth.admin.listUsers()
    if (error || !data?.users) return null

    const found = data.users.find(
      (u) => u.email && u.email.trim().toLowerCase() === normalizedEmail
    )

    if (!found) return null

    return {
      id: found.id,
      email: found.email!,
      name: (found.user_metadata?.name as string) || (found.user_metadata?.full_name as string) || found.email,
    }
  }

  /**
   * Busca um convite pelo token público/único
   */
  async findInvitationByToken(token: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('event_invitations')
      .select('*, events(id, title, date, location, image_url, organizer_id)')
      .eq('token', token)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data
  }

  /**
   * Verifica se já existe convite pendente para determinado e-mail no evento
   */
  async findPendingInvitation(eventId: string, email: string) {
    const normalizedEmail = email.trim().toLowerCase()
    const { data, error } = await this.supabase
      .getClient()
      .from('event_invitations')
      .select('*')
      .eq('event_id', eventId)
      .ilike('invited_email', normalizedEmail)
      .eq('status', 'PENDING')
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data
  }

  /**
   * Lista todos os convites de um evento
   */
  async findInvitationsByEvent(eventId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('event_invitations')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return data ?? []
  }

  /**
   * Cria um novo convite de sócio
   */
  async createInvitation(params: {
    eventId: string
    invitedEmail: string
    invitedUserId?: string | null
    invitedBy: string
    token: string
  }) {
    const normalizedEmail = params.invitedEmail.trim().toLowerCase()

    const { data, error } = await this.supabase
      .getClient()
      .from('event_invitations')
      .insert({
        event_id: params.eventId,
        invited_email: normalizedEmail,
        invited_user_id: params.invitedUserId || null,
        invited_by: params.invitedBy,
        token: params.token,
        status: 'PENDING',
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  /**
   * Cancela um convite pendente
   */
  async cancelInvitation(inviteId: string, eventId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('event_invitations')
      .update({ status: 'CANCELLED' })
      .eq('id', inviteId)
      .eq('event_id', eventId)
      .eq('status', 'PENDING')
      .select('*')
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data
  }

  /**
   * Transfere/Atualiza o estado do convite para ACCEPTED e vincula na tabela event_members
   */
  async acceptInvitation(inviteId: string, eventId: string, userId: string) {
    const client = this.supabase.getClient()

    // 1. Atualizar convite
    const { data: invite, error: inviteErr } = await client
      .from('event_invitations')
      .update({
        status: 'ACCEPTED',
        accepted_at: new Date().toISOString(),
        invited_user_id: userId,
      })
      .eq('id', inviteId)
      .select('*')
      .single()

    if (inviteErr) throw new Error(inviteErr.message)

    // 2. Inserir ou Reativar membro no evento
    const { data: existingMember } = await client
      .from('event_members')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingMember) {
      const { data: updatedMember, error: memberErr } = await client
        .from('event_members')
        .update({ status: 'ACTIVE', role: 'PARTNER' })
        .eq('id', existingMember.id)
        .select('*')
        .single()

      if (memberErr) throw new Error(memberErr.message)
      return { invite, member: updatedMember }
    } else {
      const { data: newMember, error: memberErr } = await client
        .from('event_members')
        .insert({
          event_id: eventId,
          user_id: userId,
          role: 'PARTNER',
          status: 'ACTIVE',
        })
        .select('*')
        .single()

      if (memberErr) throw new Error(memberErr.message)
      return { invite, member: newMember }
    }
  }

  /**
   * Rejeita convite
   */
  async rejectInvitation(inviteId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('event_invitations')
      .update({ status: 'REJECTED' })
      .eq('id', inviteId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  /**
   * Verifica se o usuário é sócio ativo do evento
   */
  async findActiveMember(eventId: string, userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('event_members')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data
  }

  /**
   * Verifica se e-mail já é de um sócio ativo
   */
  async findActiveMemberByEmail(eventId: string, email: string) {
    const user = await this.findUserByEmail(email)
    if (!user) return null
    return this.findActiveMember(eventId, user.id)
  }

  /**
   * Lista todos os membros de um evento
   */
  async findMembersByEvent(eventId: string) {
    const { data: members, error } = await this.supabase
      .getClient()
      .from('event_members')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    if (!members || members.length === 0) return []

    // Enriquecer dados dos usuários
    const userIds = members.map((m) => m.user_id)
    const { data: usersData } = await this.supabase.getClient().auth.admin.listUsers()

    const userMap = new Map<string, { email: string; name: string }>()
    if (usersData?.users) {
      for (const u of usersData.users) {
        userMap.set(u.id, {
          email: u.email ?? '',
          name: (u.user_metadata?.name as string) || (u.user_metadata?.full_name as string) || u.email || 'Sócio sem nome',
        })
      }
    }

    return members.map((m) => {
      const uInfo = userMap.get(m.user_id)
      return {
        ...m,
        user_email: uInfo?.email || '',
        user_name: uInfo?.name || uInfo?.email || 'Sócio',
      }
    })
  }

  /**
   * Remove sócio do evento
   */
  async removeMember(eventId: string, memberUserId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('event_members')
      .update({ status: 'REMOVED' })
      .eq('event_id', eventId)
      .eq('user_id', memberUserId)
      .select('*')
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data
  }
}

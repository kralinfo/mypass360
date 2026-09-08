import { Injectable } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { SupabaseService } from '@/common/supabase/supabase.service'
import type { CreateEventDto } from './dto/create-event.dto'

type UpdateEventDto = Partial<CreateEventDto>

function sanitizeEvent<T extends Record<string, any>>(event: T | null): T | null {
  if (!event) return null
  const { access_password_hash, ...rest } = event
  return ({
    ...rest,
    has_password: Boolean(access_password_hash),
  } as unknown) as T
}

@Injectable()
export class EventsRepository {
  private readonly table = 'events'

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Lista eventos públicos: publicados, visibilidade pública (PUBLIC), data agendada válida e SEM solicitação de exclusão pendente.
   */
  async findAll() {
    const now = new Date().toISOString()

    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .select('*')
      .eq('status', 'published')
      .eq('visibility', 'PUBLIC')
      .neq('deletion_status', 'pending')
      .or(`published_at.is.null,published_at.lte.${now}`)
      .order('date', { ascending: true })

    if (error) throw new Error(error.message)
    return (data ?? []).map((item) => sanitizeEvent(item))
  }

  /**
   * Busca evento por slug — respeita a mesma regra de visibilidade pública.
   */
  async findBySlug(slug: string) {
    const now = new Date().toISOString()

    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .or(`published_at.is.null,published_at.lte.${now}`)
      .single()

    if (error) return null
    return sanitizeEvent(data)
  }

  /**
   * Retorna todos os eventos do usuário (sem filtro de publicação).
   * Usado pela tela "Meus Eventos".
   */
  async findByOwner(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .select('*, ticket_types(*)')
      .eq('organizer_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []).map((item) => sanitizeEvent(item))
  }

  /**
   * Busca um evento por ID (sem filtro de owner — usado para edição).
   */
  async findById(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .select('*, ticket_types(*)')
      .eq('id', id)
      .single()

    if (error) return null
    return sanitizeEvent(data)
  }

  /**
   * Busca o hash da senha de acesso do evento (uso interno seguro no backend).
   */
  async getAccessPasswordHash(id: string): Promise<{ access_password_hash: string | null; event_type: string } | null> {
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .select('access_password_hash, event_type')
      .eq('id', id)
      .single()

    if (error) return null
    return data
  }

  /**
   * Busca um evento por ID, validando que pertence ao usuário.
   * Retorna null se não encontrar ou não for o proprietário.
   */
  async findByIdAndOwner(id: string, userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .select('*')
      .eq('id', id)
      .eq('organizer_id', userId)
      .single()

    if (error) return null
    return sanitizeEvent(data)
  }

  /**
   * Cria novo evento preenchendo organizer_id automaticamente com o userId autenticado.
   */
  async create(dto: CreateEventDto, userId: string) {
    const eventType = dto.event_type ?? 'PAID'
    let accessPasswordHash: string | null = null

    if (eventType === 'FREE' && dto.access_password && dto.access_password.trim() !== '') {
      accessPasswordHash = bcrypt.hashSync(dto.access_password.trim(), 10)
    }

    const { data: event, error: eventError } = await this.supabase
      .getClient()
      .from(this.table)
      .insert({
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        date: dto.date,
        location: dto.location,
        organizer_id: userId, // sempre do JWT, nunca do body
        capacity: dto.capacity,
        price: eventType === 'FREE' ? 0 : (dto.price ?? 0),
        status: dto.status ?? 'draft',
        event_type: eventType,
        visibility: dto.visibility ?? 'PUBLIC',
        access_password_hash: accessPasswordHash,
        ticket_layout: dto.ticket_layout ?? 'ticket',
        participant_id_type: dto.participant_id_type ?? 'name',
        image_url: dto.image_url ?? null,
        genre: dto.genre ?? null,
      })
      .select()
      .single()

    if (eventError) throw new Error(eventError.message)

    if (dto.ticket_types && dto.ticket_types.length > 0) {
      const ticketTypesToInsert = dto.ticket_types.map((ticketType) => ({
        event_id: event.id,
        name: ticketType.name,
        price: eventType === 'FREE' ? 0 : ticketType.price,
        quantity: ticketType.quantity,
        description: ticketType.description ?? null,
        sold: ticketType.sold ?? 0,
      }))

      const { error: ticketsError } = await this.supabase
        .getClient()
        .from('ticket_types')
        .insert(ticketTypesToInsert)

      if (ticketsError) {
        throw new Error(ticketsError.message)
      }
    }

    return sanitizeEvent(event)
  }

  /**
   * Atualiza evento — valida que pertence ao userId antes de alterar.
   */
  async update(id: string, userId: string, dto: UpdateEventDto) {
    // Remover campos que o usuário não deve poder alterar diretamente ou que não pertencem à tabela
    const { status: _s, ticket_types: _tt, access_password, ...safeDto } = dto as any

    const updatePayload: Record<string, any> = {
      ...safeDto,
      updated_at: new Date().toISOString(),
    }

    if (dto.event_type !== undefined) {
      updatePayload.event_type = dto.event_type
      if (dto.event_type === 'FREE') {
        updatePayload.price = 0
      }
    }

    if (dto.visibility !== undefined) {
      updatePayload.visibility = dto.visibility
    }

    if (access_password !== undefined) {
      if (access_password && typeof access_password === 'string' && access_password.trim() !== '') {
        updatePayload.access_password_hash = bcrypt.hashSync(access_password.trim(), 10)
      } else {
        updatePayload.access_password_hash = null
      }
    }

    // Log para diagnóstico
    console.log('[EventsRepository.update] Updating event:', id, 'userId:', userId, 'fields:', Object.keys(updatePayload))

    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .update(updatePayload)
      .eq('id', id)
      .eq('organizer_id', userId)
      .select()
      .single()

    if (error) {
      console.error('[EventsRepository.update] Supabase error:', error.message, error.details)
      throw new Error(error.message)
    }

    if (!data) {
      // 0 linhas atualizadas — provavelmente organizer_id não bate com userId
      // Verificar se o evento existe e logar o organizer_id real
      const { data: existing } = await this.supabase
        .getClient()
        .from(this.table)
        .select('id, organizer_id')
        .eq('id', id)
        .single()

      console.error(
        '[EventsRepository.update] No rows updated.',
        'Event organizer_id:', existing?.organizer_id,
        'JWT userId:', userId,
        'Match:', existing?.organizer_id === userId
      )

      throw new Error('Evento não encontrado ou você não tem permissão para editá-lo.')
    }

    // Sincronizar ticket_types de forma inteligente
    if (dto.ticket_types && dto.ticket_types.length > 0) {
      // 1. Buscar tipos atuais no banco
      const { data: existingTypes } = await this.supabase
        .getClient()
        .from('ticket_types')
        .select('*')
        .eq('event_id', id)

      const existingMap = new Map((existingTypes ?? []).map((t) => [t.name.trim().toLowerCase(), t]))

      const toInsert = []
      const toUpdate = []
      const processedNames = new Set<string>()

      for (const tt of dto.ticket_types) {
        const key = tt.name.trim().toLowerCase()
        processedNames.add(key)

        const existing = existingMap.get(key)
        if (existing) {
          // Já existe -> Atualiza (quantidade, preço, descrição)
          toUpdate.push({
            id: existing.id,
            name: tt.name.trim(),
            price: tt.price,
            quantity: tt.quantity,
            description: tt.description ?? null,
          })
        } else {
          // Novo -> Insere
          toInsert.push({
            event_id: id,
            name: tt.name.trim(),
            price: tt.price,
            quantity: tt.quantity,
            description: tt.description ?? null,
            sold: 0,
          })
        }
      }

      // Executar Updates individuais
      for (const item of toUpdate) {
        await this.supabase
          .getClient()
          .from('ticket_types')
          .update({
            price: item.price,
            quantity: item.quantity,
            description: item.description,
          })
          .eq('id', item.id)
      }

      // Executar Inserts em lote
      if (toInsert.length > 0) {
        await this.supabase.getClient().from('ticket_types').insert(toInsert)
      }

      // Executar Deletes apenas dos tipos que foram removidos e não possuem vendas
      const toDelete = (existingTypes ?? []).filter(
        (t) => !processedNames.has(t.name.trim().toLowerCase()) && (t.sold ?? 0) === 0
      )

      if (toDelete.length > 0) {
        const idsToDelete = toDelete.map((t) => t.id)
        await this.supabase.getClient().from('ticket_types').delete().in('id', idsToDelete)
      }
    }

    return sanitizeEvent(data)
  }

  /**
   * Publica o evento imediatamente.
   * EXIGE que approval_status = 'approved' antes de publicar.
   * Lança erro se a condição não for atendida.
   */
  async publish(id: string, userId: string) {
    // Verificar se o evento está aprovado antes de publicar
    const { data: current, error: fetchError } = await this.supabase
      .getClient()
      .from(this.table)
      .select('approval_status, organizer_id')
      .eq('id', id)
      .eq('organizer_id', userId)
      .single()

    if (fetchError || !current) {
      throw new Error('Evento não encontrado ou sem permissão para publicar.')
    }

    if (current.approval_status !== 'approved') {
      throw new Error(
        'APPROVAL_REQUIRED: Este evento ainda não foi aprovado para publicação. ' +
        'Solicite a publicação e aguarde a análise do administrador.'
      )
    }

    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .update({
        status: 'published',
        published_at: null, // publicação imediata = sem agendamento
      })
      .eq('id', id)
      .eq('organizer_id', userId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  /**
   * Oculta o evento (volta para draft).
   * Não altera o approval_status — organizador mantém a aprovação pós-ocultamento.
   */
  async unpublish(id: string, userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .update({
        status: 'draft',
        published_at: null,
      })
      .eq('id', id)
      .eq('organizer_id', userId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  /**
   * Agenda a publicação para uma data futura.
   * EXIGE que approval_status = 'approved' antes de agendar.
   */
  async schedule(id: string, userId: string, publishedAt: string) {
    const { data: current, error: fetchError } = await this.supabase
      .getClient()
      .from(this.table)
      .select('approval_status, organizer_id')
      .eq('id', id)
      .eq('organizer_id', userId)
      .single()

    if (fetchError || !current) {
      throw new Error('Evento não encontrado ou sem permissão para agendar.')
    }

    if (current.approval_status !== 'approved') {
      throw new Error(
        'APPROVAL_REQUIRED: Este evento ainda não foi aprovado para publicação. ' +
        'Solicite a publicação e aguarde a análise do administrador.'
      )
    }

    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .update({
        status: 'published',
        published_at: publishedAt,
      })
      .eq('id', id)
      .eq('organizer_id', userId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }
  /**
   * Registra uma solicitação de aprovação pelo organizador.
   * Apenas permitido para eventos em draft com approval_status 'none' ou 'rejected'.
   */
  async requestApproval(id: string, userId: string) {
    // Verificar condições antes de solicitar
    const { data: current, error: fetchError } = await this.supabase
      .getClient()
      .from(this.table)
      .select('approval_status, status')
      .eq('id', id)
      .eq('organizer_id', userId)
      .single()

    if (fetchError || !current) {
      throw new Error('Evento não encontrado ou sem permissão.')
    }

    if (current.status !== 'draft') {
      throw new Error(
        'INVALID_STATUS: Apenas eventos em rascunho podem solicitar publicação.'
      )
    }

    const approval = current.approval_status ?? 'none'
    if (approval === 'pending') {
      throw new Error(
        'ALREADY_PENDING: Este evento já possui uma solicitação de publicação aguardando análise.'
      )
    }
    if (approval === 'approved') {
      throw new Error(
        'ALREADY_APPROVED: Este evento já foi aprovado. Utilize a opção Publicar.'
      )
    }

    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .update({
        approval_status: 'pending',
        approval_requested_at: new Date().toISOString(),
        approval_reviewed_at: null,
        approved_by: null,
      })
      .eq('id', id)
      .eq('organizer_id', userId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }


  /**
   * Registra uma solicitação de exclusão pelo organizador.
   * Exige motivo obrigatório.
   */
  async requestDeletion(id: string, userId: string, reason: string) {
    const { data: current, error: fetchError } = await this.supabase
      .getClient()
      .from(this.table)
      .select('deletion_status, status, approval_status, published_at')
      .eq('id', id)
      .eq('organizer_id', userId)
      .single()

    if (fetchError || !current) {
      throw new Error('Evento não encontrado ou sem permissão.')
    }

    if (current.deletion_status === 'pending') {
      throw new Error('ALREADY_PENDING_DELETION: Este evento já possui uma solicitação de exclusão em análise.')
    }

    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .update({
        deletion_status: 'pending',
        deletion_requested_at: new Date().toISOString(),
        deletion_reason: reason,
        deletion_reviewed_at: null,
        deletion_reviewed_by: null,
      })
      .eq('id', id)
      .eq('organizer_id', userId)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  async remove(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from(this.table)
      .delete()
      .eq('id', id)
      .eq('organizer_id', userId)

    if (error) {
      if (error.code === '23503') {
        throw new Error('foreign_key_violation')
      }
      throw new Error(error.message)
    }
  }
}


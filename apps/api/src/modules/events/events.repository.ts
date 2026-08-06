import { Injectable } from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'
import type { CreateEventDto } from './dto/create-event.dto'

type UpdateEventDto = Partial<CreateEventDto>

@Injectable()
export class EventsRepository {
  private readonly table = 'events'

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Lista eventos públicos: publicados e cuja data de publicação já passou (ou não há data agendada).
   */
  async findAll() {
    const now = new Date().toISOString()

    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .select('*')
      .eq('status', 'published')
      .or(`published_at.is.null,published_at.lte.${now}`)
      .order('date', { ascending: true })

    if (error) throw new Error(error.message)
    return data
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
    return data
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
    return data ?? []
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
    return data
  }

  /**
   * Cria novo evento preenchendo organizer_id automaticamente com o userId autenticado.
   */
  async create(dto: CreateEventDto, userId: string) {
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
        price: dto.price ?? 0,
        status: dto.status ?? 'draft',
        ticket_layout: dto.ticket_layout ?? 'ticket',
        participant_id_type: dto.participant_id_type ?? 'name',
      })
      .select()
      .single()

    if (eventError) throw new Error(eventError.message)

    if (dto.ticket_types && dto.ticket_types.length > 0) {
      const ticketTypesToInsert = dto.ticket_types.map((ticketType) => ({
        event_id: event.id,
        name: ticketType.name,
        price: ticketType.price,
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

    return event
  }

  /**
   * Atualiza evento — valida que pertence ao userId antes de alterar.
   */
  async update(id: string, userId: string, dto: UpdateEventDto) {
    // Remover campos que o usuário não deve poder alterar diretamente ou que não pertencem à tabela
    const { status: _s, ticket_types: _tt, ...safeDto } = dto
    // ticket_layout e participant_id_type fazem parte de safeDto e serão incluídos no update

    // Log para diagnóstico
    console.log('[EventsRepository.update] Updating event:', id, 'userId:', userId, 'fields:', Object.keys(safeDto))

    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .update({ ...safeDto, updated_at: new Date().toISOString() })
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

    // Atualizar ticket_types se fornecidos
    if (dto.ticket_types && dto.ticket_types.length > 0) {
      // Deletar tipos existentes e recriar
      await this.supabase.getClient().from('ticket_types').delete().eq('event_id', id)

      const ticketTypesToInsert = dto.ticket_types.map((tt) => ({
        event_id: id,
        name: tt.name,
        price: tt.price,
        quantity: tt.quantity,
        description: tt.description ?? null,
        sold: 0,
      }))

      const { error: ttError } = await this.supabase
        .getClient()
        .from('ticket_types')
        .insert(ticketTypesToInsert)

      if (ttError) {
        console.warn('[EventsRepository.update] Could not update ticket_types:', ttError.message)
      }
    }

    return data
  }

  /**
   * Publica o evento imediatamente.
   */
  async publish(id: string, userId: string) {
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
   */
  async schedule(id: string, userId: string, publishedAt: string) {
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

import { Injectable } from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'
import type { CreateEventDto } from './dto/create-event.dto'

type UpdateEventDto = Partial<CreateEventDto>

@Injectable()
export class EventsRepository {
  private readonly table = 'events'

  constructor(private readonly supabase: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .select('*')
      .eq('status', 'published')
      .order('date', { ascending: true })

    if (error) throw new Error(error.message)
    return data
  }

  async findBySlug(slug: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) return null
    return data
  }

  async create(dto: CreateEventDto) {
    const { data: event, error: eventError } = await this.supabase
      .getClient()
      .from(this.table)
      .insert({
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        date: dto.date,
        location: dto.location,
        organizer_id: dto.organizer_id,
        capacity: dto.capacity,
        price: dto.price ?? 0,
        status: dto.status ?? 'draft',
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

  async update(id: string, dto: UpdateEventDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .update(dto)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.getClient().from(this.table).delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
}

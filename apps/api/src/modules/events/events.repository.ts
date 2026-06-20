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
    const { data, error } = await this.supabase
      .getClient()
      .from(this.table)
      .insert(dto)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
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

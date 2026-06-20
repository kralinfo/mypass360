import { Injectable, NotFoundException } from '@nestjs/common'
import { EventsRepository } from './events.repository'
import type { CreateEventDto } from './dto/create-event.dto'
import type { UpdateEventDto } from './dto/update-event.dto'

@Injectable()
export class EventsService {
  constructor(private readonly eventsRepository: EventsRepository) {}

  findAll() {
    return this.eventsRepository.findAll()
  }

  async findBySlug(slug: string) {
    const event = await this.eventsRepository.findBySlug(slug)
    if (!event) throw new NotFoundException(`Evento '${slug}' não encontrado`)
    return event
  }

  create(dto: CreateEventDto) {
    return this.eventsRepository.create(dto)
  }

  update(id: string, dto: UpdateEventDto) {
    return this.eventsRepository.update(id, dto)
  }

  remove(id: string) {
    return this.eventsRepository.remove(id)
  }
}

import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common'
import { EventsService } from './events.service'
import { CreateEventDto } from './dto/create-event.dto'
import { UpdateEventDto } from './dto/update-event.dto'

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll() {
    return this.eventsService.findAll()
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.eventsService.findBySlug(slug)
  }

  @Post()
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id)
  }
}

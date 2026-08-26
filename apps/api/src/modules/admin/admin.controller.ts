import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { AdminService } from './admin.service'
import { UpdateAdminUserStatusDto } from './dto/update-admin-user-status.dto'
import { UpdateAdminEventStatusDto } from './dto/update-admin-event-status.dto'
import { CreateCheckinAccessDto } from './dto/create-checkin-access.dto'
import { UpdateCheckinAccessDto } from './dto/update-checkin-access.dto'
import { UpdateEventCheckinStatusDto } from './dto/update-event-checkin-status.dto'


@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard()
  }

  @Patch('users/:id/status')
  updateUserStatus(@Param('id') id: string, @Body() dto: UpdateAdminUserStatusDto) {
    return this.adminService.updateUserStatus(id, dto.disabled)
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id)
  }

  @Patch('events/:id/status')
  updateEventStatus(@Param('id') id: string, @Body() dto: UpdateAdminEventStatusDto) {
    return this.adminService.updateEventStatus(id, dto.status)
  }

  @Delete('events/:id')
  deleteEvent(@Param('id') id: string) {
    return this.adminService.deleteEvent(id)
  }

  @Post('events/:id/remind-pending')
  remindPendingOrders(@Param('id') id: string) {
    return this.adminService.remindPendingOrders(id)
  }

  @Get('events/:id/attendees')
  getEventAttendees(@Param('id') id: string) {
    return this.adminService.getEventAttendees(id)
  }

  @Get('events/:id/details')
  getEventDetails(@Param('id') id: string) {
    return this.adminService.getEventDetails(id)
  }

  @Get('events/:id/checkin-accesses')
  getCheckinAccesses(@Param('id') id: string) {
    return this.adminService.getCheckinAccesses(id)
  }

  @Post('events/:id/checkin-accesses')
  createCheckinAccess(@Param('id') id: string, @Body() dto: CreateCheckinAccessDto) {
    return this.adminService.createCheckinAccess(id, dto.name)
  }

  @Patch('events/:id/checkin-accesses/:accessId')
  updateCheckinAccess(
    @Param('id') _id: string,
    @Param('accessId') accessId: string,
    @Body() dto: UpdateCheckinAccessDto
  ) {
    return this.adminService.updateCheckinAccess(accessId, dto)
  }

  @Delete('events/:id/checkin-accesses/:accessId')
  deleteCheckinAccess(
    @Param('id') _id: string,
    @Param('accessId') accessId: string
  ) {
    return this.adminService.deleteCheckinAccess(accessId)
  }

  @Get('events/:id/checkins')
  getEventCheckins(@Param('id') id: string) {
    return this.adminService.getEventCheckins(id)
  }

  @Patch('events/:id/checkin-status')
  updateEventCheckinStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEventCheckinStatusDto
  ) {
    return this.adminService.updateEventCheckinStatus(id, dto.enabled)
  }


  @Delete('events/:id/checkins/:checkinId')
  deleteEventCheckin(
    @Param('id') eventId: string,
    @Param('checkinId') checkinId: string
  ) {
    return this.adminService.deleteEventCheckin(eventId, checkinId)
  }

  /**
   * Limpa todos os check-ins do evento para testes.
   * // TODO: Avaliar remoção ou restrição desta ação em produção.
   * // Funcionalidade utilizada atualmente para resetar check-ins durante testes.
   */
  @Delete('events/:id/checkins')
  resetEventCheckins(@Param('id') id: string) {
    return this.adminService.resetEventCheckins(id)
  }
}




import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common'
import { AdminService } from './admin.service'
import { UpdateAdminUserStatusDto } from './dto/update-admin-user-status.dto'
import { UpdateAdminEventStatusDto } from './dto/update-admin-event-status.dto'

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
}
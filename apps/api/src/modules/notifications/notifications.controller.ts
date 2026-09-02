import { Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { AuthGuard, type AuthenticatedUser } from '@/common/guards/auth.guard'
import { CurrentUser } from '@/common/decorators/current-user.decorator'

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * GET /notifications — Lista notificações do usuário autenticado.
   */
  @Get()
  findByUser(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50
    return this.notificationsService.findByUser(user.id, parsedLimit)
  }

  /**
   * GET /notifications/unread-count — Retorna a contagem de notificações não lidas.
   */
  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getUnreadCount(user.id)
  }

  /**
   * PATCH /notifications/read-all — Marca todas as notificações como lidas.
   */
  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(user.id)
  }

  /**
   * DELETE /notifications/clear-all — Exclui todas as notificações do usuário.
   */
  @Delete('clear-all')
  clearAll(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.clearAll(user.id)
  }

  /**
   * PATCH /notifications/:id/read — Marca uma notificação como lida.
   */
  @Patch(':id/read')
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.notificationsService.markAsRead(id, user.id)
  }
}

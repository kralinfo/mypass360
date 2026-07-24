import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { AuthenticatedUser } from '@/common/guards/auth.guard'

/**
 * Extrai o usuário autenticado da request.
 * Deve ser usado somente em rotas protegidas com @UseGuards(AuthGuard).
 *
 * @example
 * @Get('my')
 * @UseGuards(AuthGuard)
 * findMyEvents(@CurrentUser() user: AuthenticatedUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>()
    return request.user
  }
)

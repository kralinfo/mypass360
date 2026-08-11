import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'

export interface AuthenticatedUser {
  id: string
  email: string
  user_metadata: Record<string, unknown>
}

interface RequestWithUser {
  headers: Record<string, string | string[] | undefined>
  user: AuthenticatedUser
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>()

    const authHeader = request.headers['authorization']
    const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader

    if (!headerValue || !headerValue.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação ausente')
    }

    const token = headerValue.slice(7)

    const {
      data: { user },
      error,
    } = await this.supabase.getClient().auth.getUser(token)

    if (error || !user) {
      throw new UnauthorizedException('Token inválido ou expirado')
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email ?? '',
      user_metadata: user.user_metadata ?? {},
    }

    // Injeta o usuário na request para ser acessado via @CurrentUser()
    request.user = authenticatedUser

    return true
  }
}

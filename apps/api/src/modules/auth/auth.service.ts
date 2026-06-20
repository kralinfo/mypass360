import { Injectable, UnauthorizedException } from '@nestjs/common'
import { SupabaseService } from '@/common/supabase/supabase.service'
import type { LoginDto } from './dto/login.dto'
import type { RegisterDto } from './dto/register.dto'

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseService) {}

  async register(dto: RegisterDto) {
    const { data, error } = await this.supabase.getClient().auth.signUp({
      email: dto.email,
      password: dto.password,
      options: { data: { name: dto.name } },
    })

    if (error) throw new UnauthorizedException(error.message)
    return { user: data.user }
  }

  async login(dto: LoginDto) {
    const { data, error } = await this.supabase
      .getClient()
      .auth.signInWithPassword({ email: dto.email, password: dto.password })

    if (error) throw new UnauthorizedException(error.message)
    return { user: data.user, session: data.session }
  }
}

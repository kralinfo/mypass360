import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/eventos'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // NEXT_PUBLIC_SITE_URL garante a URL pública correta em produção/preview
  // evitando que o Render use a porta interna (ex: localhost:10000)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? origin

  return NextResponse.redirect(`${baseUrl}${next}`)
}

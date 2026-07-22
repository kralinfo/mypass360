import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ─── Admin allowlist ──────────────────────────────────────────────────────────
// Comma-separated list of admin emails. Set ADMIN_EMAILS in .env.local
function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? 'admin@mypass360.com'
  return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
}

function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false
  return getAdminEmails().includes(email.toLowerCase())
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname

  // ─── Admin route protection ───────────────────────────────────────────────
  // /admin/* requires authentication AND admin email
  const isAdminRoute      = pathname.startsWith('/admin') && !pathname.startsWith('/admin-login')
  const isAdminLoginRoute = pathname.startsWith('/admin-login')

  if (isAdminRoute) {
    const userEmail = session?.user?.email
    const hasAdminAccess = !!session && isAdminEmail(userEmail)

    if (!hasAdminAccess) {
      // Redirect to admin login, preserving destination for post-login redirect
      const url = request.nextUrl.clone()
      url.pathname = '/admin-login'
      if (pathname !== '/admin') {
        url.searchParams.set('next', pathname)
      }
      return NextResponse.redirect(url)
    }
  }

  // If already authenticated as admin and visiting admin-login, redirect to /admin
  if (isAdminLoginRoute && session && isAdminEmail(session.user?.email)) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    return NextResponse.redirect(url)
  }

  // ─── Regular route protection ─────────────────────────────────────────────
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/cadastro')
  const isProtectedRoute =
    pathname.startsWith('/checkout') || pathname.startsWith('/meus-eventos')

  if (!session && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (session && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/eventos'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

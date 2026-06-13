import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PLANNER_PROTECTED = ['/dashboard', '/events']
const CLIENT_PROTECTED = ['/client/dashboard', '/client/event']
const VENDOR_PROTECTED = ['/vendor/dashboard', '/vendor/event', '/vendor/onboarding']
// / is public for anonymous users; signed-in users are redirected to their role dashboard (see below)
// /rsvp is intentionally public — guests respond without authentication via a token-scoped URL
// /vendor/invite and /vendor/login are intentionally public — vendors land there before authentication

export async function middleware(request: NextRequest) {
  const hostname = (request.headers.get('host') || '')
    .toLowerCase()
    .split(':')[0]

  const isMarketingHost =
    hostname === 'planiq.ai' || hostname === 'www.planiq.ai'

  if (isMarketingHost) {
    const { pathname } = request.nextUrl

    const normalisedPathname =
      pathname !== '/' && pathname.endsWith('/')
        ? pathname.slice(0, -1)
        : pathname

    const marketingRoutes = new Set(['/', '/contact', '/privacy', '/terms'])

    if (marketingRoutes.has(normalisedPathname)) {
      return NextResponse.next()
    }

    const redirectUrl = request.nextUrl.clone()
    redirectUrl.protocol = 'https:'
    redirectUrl.hostname = 'app.planiq.ai'
    redirectUrl.port = ''

    return NextResponse.redirect(redirectUrl, 307)
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const authEntryPaths = new Set(['/', '/login', '/signup'])
  const authEntryNormalised =
    pathname !== '/' && pathname.endsWith('/')
      ? pathname.slice(0, -1)
      : pathname

  if (authEntryPaths.has(authEntryNormalised) && user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      // Don't leak user info to logs; fall through to landing page rather
      // than redirect to a wrong place. Next request will likely succeed.
      console.error('Middleware: profile lookup failed at /', profileError.code)
    } else {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.search = '' // drop marketing query params on redirect

      if (profile?.role === 'planner') {
        redirectUrl.pathname = '/dashboard'
        return NextResponse.redirect(redirectUrl)
      }
      if (profile?.role === 'client') {
        redirectUrl.pathname = '/client/dashboard'
        return NextResponse.redirect(redirectUrl)
      }
      if (profile?.role === 'vendor') {
        redirectUrl.pathname = '/vendor/dashboard'
        return NextResponse.redirect(redirectUrl)
      }
      // No profile row, or profile.role is null — user signed up but hasn't
      // completed onboarding. Send them there.
      redirectUrl.pathname = '/onboarding'
      return NextResponse.redirect(redirectUrl)
    }
  }

  const isPlannerProtected = PLANNER_PROTECTED.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
  const isClientProtected = CLIENT_PROTECTED.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
  const isVendorProtected = VENDOR_PROTECTED.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  if ((isPlannerProtected || isClientProtected || isVendorProtected) && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = isClientProtected
      ? '/client/login'
      : isVendorProtected
        ? '/vendor/login'
        : '/login'
    redirectUrl.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}

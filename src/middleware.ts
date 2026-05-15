import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PLANNER_PROTECTED = ['/dashboard', '/events']
const CLIENT_PROTECTED = ['/client/dashboard', '/client/event']
const VENDOR_PROTECTED = ['/vendor/dashboard', '/vendor/event']
// /rsvp is intentionally public — guests respond without authentication via a token-scoped URL
// /vendor/invite and /vendor/login are intentionally public — vendors land there before authentication

export async function middleware(request: NextRequest) {
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

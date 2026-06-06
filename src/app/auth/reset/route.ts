import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/reset-password?status=expired', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/reset-password?status=expired', request.url))
  }

  const supabase = createClient()
  const { error: exErr } = await supabase.auth.exchangeCodeForSession(code)

  if (exErr) {
    return NextResponse.redirect(new URL('/reset-password?status=expired', request.url))
  }

  return NextResponse.redirect(new URL('/reset-password?status=verified', request.url))
}

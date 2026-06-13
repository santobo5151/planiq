'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Wordmark } from '@/components/brand/Wordmark'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type Status = 'preparing' | 'valid' | 'invalid'

const FLOW_COPY: Record<string, { heading: string; buttonLabel: string }> = {
  signup:       { heading: 'Confirm your email',        buttonLabel: 'Confirm email' },
  magiclink:    { heading: 'Sign in to PlanIQ',         buttonLabel: 'Sign in' },
  recovery:     { heading: 'Reset your password',       buttonLabel: 'Continue' },
  email:        { heading: 'Confirm your email change', buttonLabel: 'Confirm' },
  email_change: { heading: 'Confirm your email change', buttonLabel: 'Confirm' },
}

const DEFAULT_COPY = { heading: 'Continue to PlanIQ', buttonLabel: 'Continue' }

export default function AuthConfirmPage() {
  const [status, setStatus] = useState<Status>('preparing')
  const [confirmUrl, setConfirmUrl] = useState<string | null>(null)
  const [flowType, setFlowType] = useState<string>('unknown')

  useEffect(() => {
    const hash = window.location.hash
    const PREFIX = '#confirmation_url='
    const raw = hash.startsWith(PREFIX) ? hash.slice(PREFIX.length) : ''

    const candidates: string[] = []
    if (raw) candidates.push(raw)
    try {
      const decoded = decodeURIComponent(raw)
      if (decoded && decoded !== raw) candidates.push(decoded)
    } catch {
      // malformed encoding — ignore, rely on raw
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    let expectedOrigin: string | null = null
    try { expectedOrigin = supabaseUrl ? new URL(supabaseUrl).origin : null }
    catch { expectedOrigin = null }

    const validUrl = expectedOrigin
      ? candidates.find((c) => {
          try {
            const p = new URL(c)
            return p.origin === expectedOrigin && p.pathname === '/auth/v1/verify'
          } catch { return false }
        })
      : undefined

    if (!validUrl) {
      setStatus('invalid')
      return
    }

    setConfirmUrl(validUrl)

    const t = new URL(validUrl).searchParams.get('type') ?? 'unknown'
    const allowed = new Set(['signup', 'magiclink', 'recovery', 'email', 'email_change'])
    setFlowType(allowed.has(t) ? t : 'unknown')
    setStatus('valid')
  }, [])

  const copy = FLOW_COPY[flowType] ?? DEFAULT_COPY

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50 px-4 py-12 flex flex-col items-center justify-center">
      <Link href="/" aria-label="PlanIQ home" className="mb-8">
        <Wordmark className="text-2xl" />
      </Link>

      <Card className="w-full max-w-md border-slate-200">
        {status === 'preparing' && (
          <CardContent className="py-8 text-center text-slate-500">
            Preparing…
          </CardContent>
        )}

        {status === 'valid' && (
          <>
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-xl text-slate-900">{copy.heading}</CardTitle>
              <CardDescription className="text-slate-600">
                Click the button below to continue securely.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <a
                href={confirmUrl!}
                className="inline-block rounded-md bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
              >
                {copy.buttonLabel}
              </a>
            </CardContent>
          </>
        )}

        {status === 'invalid' && (
          <>
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-xl text-slate-900">
                This link is invalid or has expired
              </CardTitle>
              <CardDescription className="text-slate-600">
                Please request a new link from the login page.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <Link
                href="/login"
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                Go to login
              </Link>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  )
}

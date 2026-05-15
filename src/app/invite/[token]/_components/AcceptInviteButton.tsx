'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createClient } from '@/lib/supabase/client'

interface Props {
  email: string
  token: string
}

export function AcceptInviteButton({ email, token }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleAccept() {
    setState('loading')
    setErrorMessage(null)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?invite_token=${encodeURIComponent(token)}`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    })

    if (error) {
      setErrorMessage(error.message)
      setState('error')
    } else {
      setState('sent')
    }
  }

  if (state === 'sent') {
    return (
      <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
        <AlertDescription className="text-sm leading-relaxed">
          Check your email — we&apos;ve sent a secure sign-in link to{' '}
          <strong>{email}</strong>. The link will expire in 1 hour.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-3">
      {state === 'error' && errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      <Button
        onClick={handleAccept}
        disabled={state === 'loading'}
        className="w-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70"
        size="lg"
      >
        {state === 'loading' ? 'Sending…' : 'Accept invite & continue'}
      </Button>
    </div>
  )
}

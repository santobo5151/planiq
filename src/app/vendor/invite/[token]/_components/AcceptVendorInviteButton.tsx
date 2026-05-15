'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface Props {
  email: string
  token: string
}

export function AcceptVendorInviteButton({ email, token }: Props) {
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    if (pending) return
    setPending(true)
    setError(null)

    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?vendor_invite_token=${encodeURIComponent(token)}`,
      },
    })

    setPending(false)

    if (otpError) {
      setError(otpError.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 space-y-1">
        <p className="font-medium">Check your email</p>
        <p>
          We&apos;ve sent a secure sign-in link to{' '}
          <span className="font-medium">{email}</span>. The link will expire
          in 1 hour.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleAccept}
        disabled={pending}
        className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
      >
        {pending ? 'Sending…' : 'Accept & sign in'}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

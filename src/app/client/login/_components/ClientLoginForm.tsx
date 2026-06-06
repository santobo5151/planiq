'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function ClientLoginForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMessage(null)

    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMessage('Please enter a valid email address.')
      setState('error')
      return
    }

    setState('loading')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?login_type=client`,
      },
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
          Check your email. We&apos;ve sent a secure sign-in link to{' '}
          <strong>{email.trim()}</strong>. The link will expire in 1 hour.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={state === 'loading'}
          required
        />
      </div>

      {state === 'error' && errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={state === 'loading'}
        className="w-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70"
      >
        {state === 'loading' ? 'Sending…' : 'Send sign-in link'}
      </Button>
    </form>
  )
}

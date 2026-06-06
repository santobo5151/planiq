'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

function ExpiredCard() {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Reset link expired</CardTitle>
        <CardDescription>
          This link is invalid or has already expired.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href="/forgot-password"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          Request a new link
        </Link>
      </CardContent>
    </Card>
  )
}

function MagicLinkCard({ role }: { role: string }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Use your magic-link instead</CardTitle>
        <CardDescription>
          {role === 'client' ? 'Client' : 'Vendor'} accounts sign in with a
          magic link, not a password. Check your invitation email or ask your
          event planner to resend your invite.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href={role === 'vendor' ? '/vendor/login' : '/client/login'}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          {role === 'vendor' ? 'Go to vendor login' : 'Go to client login'}
        </Link>
      </CardContent>
    </Card>
  )
}

function OnboardingRequiredCard() {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Complete your account setup</CardTitle>
        <CardDescription>
          Your account isn&apos;t fully set up yet. Please complete onboarding
          before changing your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href="/onboarding"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          Go to onboarding
        </Link>
      </CardContent>
    </Card>
  )
}

function ResetPasswordInner() {
  const router = useRouter()
  const status = useSearchParams().get('status')

  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status !== 'verified') {
      setChecking(false)
      return
    }

    let active = true
    const supabase = createClient()
    ;(async () => {
      if (active) {
        setRole(null)
        setRoleError(null)
      }
      const { data, error: userErr } = await supabase.auth.getUser()
      if (!active) return

      if (userErr || !data?.user) {
        setHasSession(false)
        setChecking(false)
        return
      }

      setHasSession(true)

      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!active) return

      if (profileErr) {
        setRoleError(profileErr.message)
      } else {
        setRole(profile?.role ?? null)
      }
      setChecking(false)
    })()

    return () => { active = false }
  }, [status])

  if (status !== 'verified') {
    return <ExpiredCard />
  }

  if (checking) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Checking your reset link…</CardTitle>
        </CardHeader>
      </Card>
    )
  }

  if (!hasSession) {
    return <ExpiredCard />
  }

  if (roleError) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Something went wrong</CardTitle>
          <CardDescription>
            We couldn&apos;t verify your account. Please try again or contact
            support if the problem persists.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Unable to load your account details. Please request a new reset
              link.
            </AlertDescription>
          </Alert>
          <Link
            href="/forgot-password"
            className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            Request a new link
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (role === 'client' || role === 'vendor') {
    return <MagicLinkCard role={role} />
  }

  if (role !== 'planner') {
    return <OnboardingRequiredCard />
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Set a new password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            disabled={loading}
          >
            {loading ? 'Updating…' : 'Set new password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Checking your reset link…</CardTitle>
          </CardHeader>
        </Card>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  )
}

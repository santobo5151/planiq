'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail } from 'lucide-react'
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

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => {
      setCooldown((current) => Math.max(0, current - 1))
    }, 1000)
    return () => clearTimeout(id)
  }, [cooldown])

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
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/auth/callback?login_type=signup` },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.session) {
      router.push('/onboarding')
      router.refresh()
    } else {
      setSubmittedEmail(email)
      setCooldown(60)
      setLoading(false)
    }
  }

  async function onResend() {
    if (cooldown > 0 || resending || !submittedEmail) return
    setResending(true)
    setResendError(null)
    setResendMessage(null)
    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: submittedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?login_type=signup`,
        },
      })
      if (resendErr) {
        setResendError('Please wait a moment before requesting another email.')
        setCooldown(60)
        return
      }
      setResendMessage('Confirmation email resent.')
      setCooldown(60)
    } catch {
      setResendError('Something went wrong. Please try again.')
      setCooldown(60)
    } finally {
      setResending(false)
    }
  }

  function onStartOver() {
    setSubmittedEmail(null)
    setCooldown(0)
    setResendError(null)
    setResendMessage(null)
    setError(null)
    setResending(false)
    setLoading(false)
  }

  if (submittedEmail) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
            <Mail className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>
              We&apos;ve sent a confirmation link to {submittedEmail}. Click it to activate your account.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-slate-600">
            Didn&apos;t get it? Check your spam folder, or resend below.
          </p>

          <Button
            type="button"
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            onClick={onResend}
            disabled={cooldown > 0 || resending}
          >
            {cooldown > 0
              ? `Resend in ${cooldown}s`
              : resending
              ? 'Resending…'
              : 'Resend confirmation email'}
          </Button>

          {resendMessage && (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
              <AlertDescription>{resendMessage}</AlertDescription>
            </Alert>
          )}
          {resendError && (
            <Alert variant="destructive">
              <AlertDescription>{resendError}</AlertDescription>
            </Alert>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={onStartOver}
              className="text-sm text-slate-600 hover:text-indigo-600 hover:underline"
            >
              Wrong email? Start over
            </button>
          </div>

          <p className="text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>
          Start planning your first event with PlanIQ.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
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
            <Label htmlFor="confirmPassword">Confirm password</Label>
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
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

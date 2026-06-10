'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { sendClientInviteAction } from '@/app/(app)/events/[eventId]/actions'

interface Props {
  eventId: string
  clientAlreadyLinked: boolean
}

export function SendInviteForm({ eventId, clientAlreadyLinked }: Props) {
  const [email, setEmail] = useState('')
  const [clientName, setClientName] = useState('')
  const [successEmail, setSuccessEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessEmail(null)

    startTransition(async () => {
      const result = await sendClientInviteAction(eventId, email, clientName)
      if (result.success) {
        setSuccessEmail(email.trim())
        setEmail('')
        setClientName('')
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-900">
          Share with client
        </CardTitle>
        <CardDescription className="text-sm text-slate-500">
          Send an invite link so your client can view the plan, budget summary,
          and checklist progress.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {clientAlreadyLinked && (
          <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>A client has already joined this event.</span>
          </div>
        )}

        {successEmail && (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
            <AlertDescription>
              Invite sent to <strong>{successEmail}</strong>. They&apos;ll
              receive an email shortly.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="clientName">Client name (optional)</Label>
            <Input
              id="clientName"
              type="text"
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value)
                setError(null)
              }}
              placeholder="Jane Doe"
              maxLength={100}
              disabled={pending}
            />
          </div>
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError(null)
              }}
              placeholder="client@example.com"
              className="flex-1"
              disabled={pending}
              required
            />
            <Button
              type="submit"
              disabled={pending || !email.trim()}
              className="bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70"
            >
              {pending ? 'Sending…' : 'Send invite'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

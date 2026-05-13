'use client'

import { useState, useTransition } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateBudgetAction } from '@/app/events/[eventId]/actions'

interface Props {
  eventId: string
}

export function BudgetGenerateButton({ eventId }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onClick() {
    setError(null)
    startTransition(async () => {
      const result = await generateBudgetAction(eventId)
      if (result.success) {
        window.location.href = `/events/${eventId}/budget`
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70"
      >
        <Sparkles className="h-4 w-4" />
        {pending ? 'Generating budget…' : 'Generate AI Budget'}
      </Button>
      <p className="text-xs text-slate-500">
        This may take a moment while PlanIQ generates your budget
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

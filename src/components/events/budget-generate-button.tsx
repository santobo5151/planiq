'use client'

import { useState, useTransition } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { generateBudgetAction } from '@/app/(app)/events/[eventId]/actions'

interface Props {
  eventId: string
  hasBudget?: boolean
}

export function BudgetGenerateButton({ eventId, hasBudget = false }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  function run() {
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

  function handleClick() {
    if (hasBudget) {
      setShowConfirm(true)
    } else {
      run()
    }
  }

  return (
    <>
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate budget?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all AI-generated line items. Any items you added
              manually will be kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirm(false)
                run()
              }}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Yes, regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-2">
        <Button
          type="button"
          onClick={handleClick}
          disabled={pending}
          className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70"
        >
          <Sparkles className="h-4 w-4" />
          {pending
            ? 'Generating budget…'
            : hasBudget
              ? 'Regenerate AI Budget'
              : 'Generate AI Budget'}
        </Button>
        <p className="text-xs text-slate-500">
          This may take a moment while PlanIQ generates your budget
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </>
  )
}

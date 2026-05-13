'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import { generatePlanAction } from '@/app/events/[eventId]/actions'

interface Props {
  eventId: string
  mode?: 'generate' | 'regenerate'
  hasPlan?: boolean
}

export function GeneratePlanButton({
  eventId,
  mode = 'generate',
  hasPlan = false,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  function run() {
    setError(null)
    startTransition(async () => {
      const result = await generatePlanAction(eventId)
      if (result.success) {
        if (mode === 'generate') {
          window.location.href = `/events/${eventId}/plan`
        } else {
          router.refresh()
        }
      } else {
        setError(result.error)
      }
    })
  }

  function handleClick() {
    if (hasPlan) {
      setShowConfirm(true)
    } else {
      run()
    }
  }

  const label = mode === 'regenerate' ? 'Regenerate Plan' : 'Generate AI Plan'
  const loadingLabel =
    mode === 'regenerate' ? 'Regenerating…' : 'Generating your plan…'

  return (
    <>
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate event plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the entire AI-generated plan with a new version.
              Any manual edits you have made to the plan will be lost.
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
          {pending ? loadingLabel : label}
        </Button>
        {mode === 'generate' && (
          <p className="text-xs text-slate-500">
            This may take a moment while PlanIQ creates your event plan.
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </>
  )
}

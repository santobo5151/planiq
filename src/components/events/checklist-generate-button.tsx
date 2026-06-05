'use client'

import { useState, useTransition } from 'react'
import { ListChecks } from 'lucide-react'
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
import { generateChecklistAction } from '@/app/(app)/events/[eventId]/actions'

interface Props {
  eventId: string
  hasChecklist?: boolean
}

export function ChecklistGenerateButton({
  eventId,
  hasChecklist = false,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  function run() {
    setError(null)
    startTransition(async () => {
      const result = await generateChecklistAction(eventId)
      if (result.success) {
        window.location.href = `/events/${eventId}/checklist`
      } else {
        setError(result.error)
      }
    })
  }

  function handleClick() {
    if (hasChecklist) {
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
            <AlertDialogTitle>Regenerate checklist?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace all AI-generated tasks. Any tasks you added
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
          <ListChecks className="h-4 w-4" />
          {pending
            ? 'Generating checklist…'
            : hasChecklist
              ? 'Regenerate AI Checklist'
              : 'Generate AI Checklist'}
        </Button>
        <p className="text-xs text-slate-500">
          This may take a moment while PlanIQ generates your checklist
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </>
  )
}

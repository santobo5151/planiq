'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { confirmBookingAction, declineBookingAction } from '../actions'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
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

interface Props {
  eventVendorId: string
}

export function VendorEventActions({ eventVendorId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [declineOpen, setDeclineOpen] = useState(false)

  function handleConfirm() {
    setErrorMessage(null)
    startTransition(async () => {
      const result = await confirmBookingAction(eventVendorId)
      if (result.success) {
        router.refresh()
      } else {
        setErrorMessage(result.error)
      }
    })
  }

  function handleDecline() {
    setErrorMessage(null)
    setDeclineOpen(false)
    startTransition(async () => {
      const result = await declineBookingAction(eventVendorId)
      if (result.success) {
        router.refresh()
      } else {
        setErrorMessage(result.error)
      }
    })
  }

  return (
    <div className="space-y-4">
      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleConfirm}
          disabled={isPending}
          className="bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-70"
        >
          {isPending ? 'Saving…' : 'Confirm booking'}
        </Button>

        <Button
          variant="outline"
          onClick={() => setDeclineOpen(true)}
          disabled={isPending}
          className="border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-70"
        >
          Decline
        </Button>
      </div>

      <AlertDialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              The planner will see that you can&apos;t take this booking.
              You won&apos;t be able to change your response later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDecline}
              disabled={isPending}
              className="bg-slate-700 text-white hover:bg-slate-800"
            >
              {isPending ? 'Saving…' : 'Decline booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

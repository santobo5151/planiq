'use client'

import {
  useState,
  useEffect,
  useTransition,
  useRef,
  type KeyboardEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
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
import {
  assignVendorAction,
  updateEventVendorAction,
  removeEventVendorAction,
} from '@/app/events/[eventId]/vendors/actions'
import { sendVendorInviteAction } from '@/app/events/[eventId]/actions'
import { categoryBadgeClass } from '@/components/vendors/vendor-card'
import type { Event, EventVendor, Vendor, VendorStatus } from '@/types/database'

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<VendorStatus, string> = {
  invited: 'Assigned',
  confirmed: 'Confirmed',
  declined: 'Declined',
}

const STATUS_STYLES: Record<VendorStatus, string> = {
  invited: 'bg-slate-100 text-slate-700 border-transparent',
  confirmed: 'bg-emerald-100 text-emerald-700 border-transparent',
  declined: 'bg-red-100 text-red-700 border-transparent',
}

// ── NotesInput (module-level for focus stability) ─────────────────────────────

interface NotesInputProps {
  initialValue: string
  disabled: boolean
  onCommit: (v: string) => void
  onCancel: () => void
}

function NotesInput({ initialValue, disabled, onCommit, onCancel }: NotesInputProps) {
  const [value, setValue] = useState(initialValue)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      onCommit(value)
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="space-y-1.5">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-h-[60px] text-sm"
        disabled={disabled}
        rows={2}
      />
      <p className="text-xs text-slate-400">
        Cmd/Ctrl+Enter to save · Escape to cancel
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => onCommit(value)}
          disabled={disabled}
          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-40"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── EventVendorManager ────────────────────────────────────────────────────────

interface InviteRowState {
  pending: boolean
  error: string | null
  success: boolean
}

interface Props {
  event: Event
  initialEventVendors: EventVendor[]
  allVendors: Vendor[]
}

export function EventVendorManager({
  event,
  initialEventVendors,
  allVendors,
}: Props) {
  const router = useRouter()
  const [eventVendors, setEventVendors] = useState<EventVendor[]>(initialEventVendors)
  const [inviteStates, setInviteStates] = useState<Record<string, InviteRowState>>({})
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [assignError, setAssignError] = useState<string | null>(null)
  const [notesEditId, setNotesEditId] = useState<string | null>(null)
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null)

  const [assignPending, startAssign] = useTransition()
  const [statusPending, startStatus] = useTransition()
  const [notesPending, startNotes] = useTransition()
  const [removePending, startRemove] = useTransition()

  useEffect(() => {
    setEventVendors(initialEventVendors)
  }, [initialEventVendors])

  const unassignedVendors = allVendors.filter(
    (v) => !eventVendors.some((ev) => ev.vendor_id === v.id)
  )

  function handleAssign() {
    if (!selectedVendorId) return
    setAssignError(null)
    startAssign(async () => {
      const result = await assignVendorAction(event.id, selectedVendorId)
      if (result.success) {
        const vendor = allVendors.find((v) => v.id === selectedVendorId)!
        const now = new Date().toISOString()
        setEventVendors((evs) => [
          ...evs,
          {
            id: result.eventVendorId,
            event_id: event.id,
            vendor_id: selectedVendorId,
            status: 'invited' as VendorStatus,
            notes: null,
            invite_token: null,
            vendor_user_id: null,
            responded_at: null,
            created_at: now,
            updated_at: now,
            vendor,
          },
        ])
        setSelectedVendorId('')
      } else {
        setAssignError(result.error)
      }
    })
  }

  function handleStatusChange(evId: string, newStatus: VendorStatus) {
    const prev = eventVendors.find((ev) => ev.id === evId)
    if (!prev) return
    setEventVendors((evs) =>
      evs.map((ev) => (ev.id === evId ? { ...ev, status: newStatus } : ev))
    )
    startStatus(async () => {
      const result = await updateEventVendorAction(evId, { status: newStatus })
      if (!result.success) {
        setEventVendors((evs) =>
          evs.map((ev) => (ev.id === evId ? { ...ev, status: prev.status } : ev))
        )
      }
    })
  }

  function commitNotes(evId: string, notes: string) {
    startNotes(async () => {
      const result = await updateEventVendorAction(evId, { notes })
      if (result.success) {
        setEventVendors((evs) =>
          evs.map((ev) =>
            ev.id === evId ? { ...ev, notes: notes.trim() || null } : ev
          )
        )
        setNotesEditId(null)
      }
    })
  }

  function executeRemove(evId: string) {
    startRemove(async () => {
      const result = await removeEventVendorAction(evId)
      if (result.success) {
        setEventVendors((evs) => evs.filter((ev) => ev.id !== evId))
      }
    })
  }

  async function handleSendInvite(evId: string, vendorId: string) {
    setInviteStates((prev) => ({
      ...prev,
      [evId]: { pending: true, error: null, success: false },
    }))
    const result = await sendVendorInviteAction(event.id, vendorId)
    if (result.success) {
      setInviteStates((prev) => ({
        ...prev,
        [evId]: { pending: false, error: null, success: true },
      }))
      // Optimistically mark invite as sent so button shows "Resend" before refresh
      setEventVendors((evs) =>
        evs.map((ev) =>
          ev.id === evId
            ? { ...ev, invite_token: ev.invite_token ?? '__sent__' }
            : ev
        )
      )
      router.refresh()
    } else {
      setInviteStates((prev) => ({
        ...prev,
        [evId]: { pending: false, error: result.error, success: false },
      }))
    }
  }

  return (
    <>
      <AlertDialog
        open={removeConfirmId !== null}
        onOpenChange={(open) => !open && setRemoveConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              This vendor will be removed from this event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const id = removeConfirmId!
                setRemoveConfirmId(null)
                executeRemove(id)
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <Link
            href={`/events/${event.id}`}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            ← Back to Event
          </Link>

          <header className="mt-4">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Event Vendors
            </h1>
            <p className="mt-1 text-slate-600">{event.title}</p>
          </header>

          {/* ── Assign vendor section ── */}
          <Card className="mt-8 border-slate-200">
            <CardContent className="p-5">
              <p className="mb-3 text-sm font-semibold text-slate-800">
                Assign a Vendor
              </p>
              {allVendors.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Add vendors to your directory first.{' '}
                  <Link
                    href="/dashboard/vendors"
                    className="font-medium text-indigo-600 hover:underline"
                  >
                    Go to Vendors
                  </Link>
                </p>
              ) : unassignedVendors.length === 0 ? (
                <p className="text-sm text-slate-500">
                  All vendors from your directory are assigned to this event.
                </p>
              ) : (
                <div className="flex gap-3">
                  <select
                    value={selectedVendorId}
                    onChange={(e) => {
                      setSelectedVendorId(e.target.value)
                      setAssignError(null)
                    }}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={assignPending}
                  >
                    <option value="">Select vendor…</option>
                    {unassignedVendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} — {v.category}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={handleAssign}
                    disabled={!selectedVendorId || assignPending}
                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    {assignPending ? 'Assigning…' : 'Assign'}
                  </Button>
                </div>
              )}
              {assignError && (
                <p className="mt-2 text-sm text-red-600">{assignError}</p>
              )}
            </CardContent>
          </Card>

          {/* ── Assigned vendors list ── */}
          <div className="mt-8">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Assigned Vendors
            </h2>
            {eventVendors.length === 0 ? (
              <Card className="border-dashed border-slate-300">
                <CardContent className="p-8 text-center">
                  <p className="text-sm text-slate-500">
                    No vendors assigned to this event yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {eventVendors.map((ev) => {
                  const invState = inviteStates[ev.id]
                  const hasEmail = !!ev.vendor?.email?.trim()
                  return (
                    <Card
                      key={ev.id}
                      className={`border-slate-200 transition-opacity ${
                        removePending ? 'opacity-70' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1 space-y-2.5">
                            {/* Name + badges */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-slate-900">
                                {ev.vendor?.name ?? 'Unknown'}
                              </span>
                              {ev.vendor?.category && (
                                <Badge
                                  className={`text-xs ${categoryBadgeClass(ev.vendor.category)}`}
                                >
                                  {ev.vendor.category}
                                </Badge>
                              )}
                              <Badge className={STATUS_STYLES[ev.status]}>
                                {STATUS_LABELS[ev.status]}
                              </Badge>
                            </div>

                            {/* Status select */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">
                                Status:
                              </span>
                              <select
                                value={ev.status}
                                onChange={(e) =>
                                  handleStatusChange(
                                    ev.id,
                                    e.target.value as VendorStatus
                                  )
                                }
                                disabled={statusPending}
                                className="rounded border border-input bg-background px-2 py-1 text-xs"
                              >
                                <option value="invited">Assigned</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="declined">Declined</option>
                              </select>
                            </div>

                            {/* Invite controls */}
                            <div className="flex flex-wrap items-center gap-2">
                              {ev.vendor_user_id !== null ? (
                                <Badge className="bg-emerald-100 text-emerald-700 border-transparent text-xs">
                                  Joined
                                </Badge>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleSendInvite(ev.id, ev.vendor_id)
                                  }
                                  disabled={!hasEmail || !!invState?.pending}
                                  title={
                                    !hasEmail
                                      ? 'Add email to vendor record first'
                                      : undefined
                                  }
                                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  {invState?.pending
                                    ? 'Sending…'
                                    : ev.invite_token !== null
                                    ? 'Resend invite'
                                    : 'Send invite'}
                                </button>
                              )}
                              {invState?.success && (
                                <span className="text-xs text-emerald-600">
                                  Invite sent!
                                </span>
                              )}
                              {invState?.error && (
                                <span className="text-xs text-red-600">
                                  {invState.error}
                                </span>
                              )}
                            </div>

                            {/* Notes */}
                            {notesEditId === ev.id ? (
                              <NotesInput
                                initialValue={ev.notes ?? ''}
                                disabled={notesPending}
                                onCommit={(v) => commitNotes(ev.id, v)}
                                onCancel={() => setNotesEditId(null)}
                              />
                            ) : (
                              <p
                                onClick={() => setNotesEditId(ev.id)}
                                className="cursor-pointer text-sm text-slate-500 hover:text-indigo-600"
                                title="Click to edit notes"
                              >
                                {ev.notes ?? 'Add notes…'}
                              </p>
                            )}
                          </div>

                          {/* Remove */}
                          <button
                            onClick={() => setRemoveConfirmId(ev.id)}
                            disabled={removePending}
                            className="shrink-0 text-slate-300 hover:text-red-500 disabled:opacity-40"
                            title="Remove vendor from event"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

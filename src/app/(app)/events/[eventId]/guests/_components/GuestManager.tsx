'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, MoreVertical, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  createGuestAction,
  updateGuestAction,
  deleteGuestAction,
  setRsvpDeadlineAction,
  togglePlusOneAllowedAction,
  sendRsvpInviteAction,
  sendBulkRsvpInvitesAction,
  clearRsvpTokenAction,
} from '@/app/(app)/events/[eventId]/actions'
import type { Guest, GuestRsvpStatus } from '@/types/database'

// ── Types ────────────────────────────────────────────────────────────────────

type EnrichedGuest = Guest & {
  rsvp_sent_at_display: string | null
  rsvp_responded_at_display: string | null
}

type StatusFilter = 'all' | GuestRsvpStatus

interface AddForm {
  first_name: string
  last_name: string
  email: string
  rsvp_status: GuestRsvpStatus
  plus_one_allowed: boolean
  plus_one: boolean
  dietary_notes: string
  error: string | null
  pending: boolean
}

interface EditState {
  guestId: string
  field: 'first_name' | 'last_name' | 'email' | 'dietary_notes'
  value: string
}

interface BulkResult {
  sent: number
  failed: number
  skipped: number
}

interface GuestManagerProps {
  eventId: string
  initialGuestsWithDisplays: EnrichedGuest[]
  initialRsvpDeadlineInputValue: string | null
  initialRsvpDeadlineDisplay: string | null
}

// ── Constants ────────────────────────────────────────────────────────────────

const EMPTY_ADD_FORM: AddForm = {
  first_name: '',
  last_name: '',
  email: '',
  rsvp_status: 'pending',
  plus_one_allowed: false,
  plus_one: false,
  dietary_notes: '',
  error: null,
  pending: false,
}

const RSVP_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'attending', label: 'Attending' },
  { value: 'declined', label: 'Declined' },
]

// Client-side email format check — server is source of truth
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Component ────────────────────────────────────────────────────────────────

export function GuestManager({
  eventId,
  initialGuestsWithDisplays,
  initialRsvpDeadlineInputValue,
  initialRsvpDeadlineDisplay,
}: GuestManagerProps) {
  const router = useRouter()

  // Guest list state
  const [guests, setGuests] = useState<EnrichedGuest[]>(initialGuestsWithDisplays)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD_FORM)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [rowError, setRowError] = useState<{ guestId: string; message: string } | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; first_name: string; last_name: string } | null>(null)

  // RSVP deadline state
  const [deadlineInputValue, setDeadlineInputValue] = useState(initialRsvpDeadlineInputValue ?? '')
  const [deadlineDisplay, setDeadlineDisplay] = useState<string | null>(initialRsvpDeadlineDisplay)
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [deadlinePending, setDeadlinePending] = useState(false)
  const [deadlineError, setDeadlineError] = useState<string | null>(null)

  // RSVP email state
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sendRowError, setSendRowError] = useState<{ guestId: string; message: string } | null>(null)
  const [clearTarget, setClearTarget] = useState<{ id: string; first_name: string; last_name: string } | null>(null)
  const [clearPending, setClearPending] = useState(false)

  // Bulk send state
  const [includePreviouslySent, setIncludePreviouslySent] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkPending, setBulkPending] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)

  // Sync local state when parent re-renders with fresh server data
  useEffect(() => {
    setGuests(initialGuestsWithDisplays)
  }, [initialGuestsWithDisplays])

  // ── Computed ────────────────────────────────────────────────────────────

  const tabCounts = useMemo(
    () => ({
      all: guests.length,
      pending: guests.filter((g) => g.rsvp_status === 'pending').length,
      attending: guests.filter((g) => g.rsvp_status === 'attending').length,
      declined: guests.filter((g) => g.rsvp_status === 'declined').length,
    }),
    [guests]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return guests.filter((g) => {
      if (statusFilter !== 'all' && g.rsvp_status !== statusFilter) return false
      if (q) {
        const full = `${g.first_name} ${g.last_name}`.toLowerCase()
        if (
          !g.first_name.toLowerCase().includes(q) &&
          !g.last_name.toLowerCase().includes(q) &&
          !full.includes(q)
        ) return false
      }
      return true
    })
  }, [guests, search, statusFilter])

  const summary = useMemo(() => {
    if (guests.length === 0) return null
    let attending = 0, declined = 0, pending = 0, attendingWithPlusOne = 0, responded = 0
    for (const g of guests) {
      if (g.rsvp_status === 'attending') { attending++; if (g.plus_one) attendingWithPlusOne++ }
      else if (g.rsvp_status === 'declined') declined++
      else pending++
      if (g.rsvp_responded_at) responded++
    }
    return {
      total: guests.length,
      attending,
      declined,
      pending,
      attendingIncludingPlusOnes: attending + attendingWithPlusOne,
      responded,
    }
  }, [guests])

  // Count of guests eligible for bulk send given current checkbox state
  const sendableCount = useMemo(
    () =>
      guests.filter((g) => {
        if (g.rsvp_status !== 'pending') return false
        if (!g.email || !EMAIL_RE.test(g.email.trim())) return false
        if (!includePreviouslySent && g.rsvp_sent_at) return false
        return true
      }).length,
    [guests, includePreviouslySent]
  )

  // ── Deadline handlers ────────────────────────────────────────────────────

  async function saveDeadline() {
    setDeadlinePending(true)
    setDeadlineError(null)
    const result = await setRsvpDeadlineAction(eventId, deadlineInputValue || null)
    setDeadlinePending(false)
    if (result.success) {
      setEditingDeadline(false)
      if (!deadlineInputValue) {
        setDeadlineDisplay(null)
      } else {
        const [year, month, day] = deadlineInputValue.split('-').map(Number)
        const d = new Date(Date.UTC(year, month - 1, day))
        setDeadlineDisplay(
          d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        )
      }
      router.refresh()
    } else {
      setDeadlineError(result.error)
    }
  }

  function cancelDeadlineEdit() {
    setDeadlineInputValue(initialRsvpDeadlineInputValue ?? '')
    setDeadlineError(null)
    setEditingDeadline(false)
  }

  async function clearDeadline() {
    setDeadlinePending(true)
    setDeadlineError(null)
    const result = await setRsvpDeadlineAction(eventId, null)
    setDeadlinePending(false)
    if (result.success) {
      setDeadlineInputValue('')
      setDeadlineDisplay(null)
      router.refresh()
    } else {
      setDeadlineError(result.error)
    }
  }

  // ── Guest handlers ───────────────────────────────────────────────────────

  function startEdit(guest: EnrichedGuest, field: EditState['field']) {
    if (pendingId === guest.id) return
    setRowError(null)
    setEditState({
      guestId: guest.id,
      field,
      value:
        field === 'first_name'
          ? guest.first_name
          : field === 'last_name'
            ? guest.last_name
            : field === 'email'
              ? (guest.email ?? '')
              : (guest.dietary_notes ?? ''),
    })
  }

  function cancelEdit() {
    setEditState(null)
  }

  async function commitEdit(guest: EnrichedGuest) {
    if (!editState || editState.guestId !== guest.id) return
    const { field, value } = editState

    const patch: Parameters<typeof updateGuestAction>[2] =
      field === 'first_name'
        ? { first_name: value }
        : field === 'last_name'
          ? { last_name: value }
          : field === 'email'
            ? { email: value || null }
            : { dietary_notes: value || null }

    setPendingId(guest.id)
    const result = await updateGuestAction(eventId, guest.id, patch)
    setPendingId(null)

    if (result.success) {
      setEditState(null)
      setGuests((prev) =>
        prev.map((g) => {
          if (g.id !== guest.id) return g
          if (field === 'first_name') return { ...g, first_name: value.trim() || g.first_name }
          if (field === 'last_name') return { ...g, last_name: value.trim() || g.last_name }
          if (field === 'email') return { ...g, email: value.trim() || null }
          return { ...g, dietary_notes: value.trim() || null }
        })
      )
      router.refresh()
    } else {
      setRowError({ guestId: guest.id, message: result.error })
    }
  }

  async function handleRsvpChange(guest: EnrichedGuest, newStatus: GuestRsvpStatus) {
    if (pendingId === guest.id) return
    setRowError(null)

    const optimistic: EnrichedGuest = {
      ...guest,
      rsvp_status: newStatus,
      plus_one: newStatus === 'declined' ? false : guest.plus_one,
    }
    setGuests((prev) => prev.map((g) => (g.id === guest.id ? optimistic : g)))
    setPendingId(guest.id)

    const result = await updateGuestAction(eventId, guest.id, { rsvp_status: newStatus })
    setPendingId(null)

    if (result.success) {
      router.refresh()
    } else {
      setGuests((prev) => prev.map((g) => (g.id === guest.id ? guest : g)))
      setRowError({ guestId: guest.id, message: result.error })
    }
  }

  async function handlePlusOneToggle(guest: EnrichedGuest) {
    if (pendingId === guest.id) return
    setRowError(null)

    const newPlusOne = !guest.plus_one
    setGuests((prev) =>
      prev.map((g) => (g.id === guest.id ? { ...g, plus_one: newPlusOne } : g))
    )
    setPendingId(guest.id)

    const result = await updateGuestAction(eventId, guest.id, { plus_one: newPlusOne })
    setPendingId(null)

    if (result.success) {
      router.refresh()
    } else {
      setGuests((prev) => prev.map((g) => (g.id === guest.id ? guest : g)))
      setRowError({ guestId: guest.id, message: result.error })
    }
  }

  async function handlePlusOneAllowedToggle(guest: EnrichedGuest) {
    if (pendingId === guest.id) return
    setRowError(null)

    const newAllowed = !guest.plus_one_allowed
    setGuests((prev) =>
      prev.map((g) => (g.id === guest.id ? { ...g, plus_one_allowed: newAllowed } : g))
    )
    setPendingId(guest.id)

    const result = await togglePlusOneAllowedAction(eventId, guest.id, newAllowed)
    setPendingId(null)

    if (result.success) {
      router.refresh()
    } else {
      setGuests((prev) => prev.map((g) => (g.id === guest.id ? guest : g)))
      setRowError({ guestId: guest.id, message: result.error })
    }
  }

  async function submitAdd() {
    if (addForm.pending) return
    setAddForm((f) => ({ ...f, error: null, pending: true }))

    const result = await createGuestAction(eventId, {
      first_name: addForm.first_name,
      last_name: addForm.last_name,
      email: addForm.email || null,
      rsvp_status: addForm.rsvp_status,
      plus_one_allowed: addForm.plus_one_allowed,
      plus_one: addForm.plus_one,
      dietary_notes: addForm.dietary_notes || null,
    })

    if (result.success) {
      const enriched: EnrichedGuest = {
        ...result.guest,
        rsvp_sent_at_display: null,
        rsvp_responded_at_display: null,
      }
      setGuests((prev) => [...prev, enriched])
      setAddForm(EMPTY_ADD_FORM)
      setAdding(false)
      router.refresh()
    } else {
      setAddForm((f) => ({ ...f, error: result.error, pending: false }))
    }
  }

  function cancelAdd() {
    setAdding(false)
    setAddForm(EMPTY_ADD_FORM)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const { id } = deleteTarget
    setDeleteTarget(null)
    setPendingId(id)

    const result = await deleteGuestAction(eventId, id)
    setPendingId(null)

    if (result.success) {
      setGuests((prev) => prev.filter((g) => g.id !== id))
      if (rowError?.guestId === id) setRowError(null)
      router.refresh()
    } else {
      setRowError({ guestId: id, message: result.error })
    }
  }

  async function handleSendRsvp(guest: EnrichedGuest) {
    if (sendingId === guest.id) return
    setSendRowError(null)
    setSendingId(guest.id)

    const result = await sendRsvpInviteAction(eventId, guest.id)
    setSendingId(null)

    if (result.success) {
      setGuests((prev) =>
        prev.map((g) =>
          g.id === guest.id ? { ...g, rsvp_token: g.rsvp_token ?? '__sent__' } : g
        )
      )
      router.refresh()
    } else {
      setSendRowError({ guestId: guest.id, message: result.error })
    }
  }

  async function confirmClearToken() {
    if (!clearTarget) return
    const { id } = clearTarget
    setClearTarget(null)
    setClearPending(true)

    const result = await clearRsvpTokenAction(eventId, id)
    setClearPending(false)

    if (result.success) {
      setGuests((prev) =>
        prev.map((g) =>
          g.id === id
            ? { ...g, rsvp_token: null, rsvp_sent_at: null, rsvp_sent_at_display: null }
            : g
        )
      )
      router.refresh()
    } else {
      setSendRowError({ guestId: id, message: result.error })
    }
  }

  async function handleBulkSend() {
    setBulkPending(true)
    setBulkError(null)
    setBulkResult(null)

    const result = await sendBulkRsvpInvitesAction(eventId, { includePreviouslySent })
    setBulkPending(false)

    if (result.success) {
      setBulkResult({ sent: result.sent, failed: result.failed, skipped: result.skipped })
      router.refresh()
    } else {
      setBulkError(result.error)
      setBulkDialogOpen(false)
    }
  }

  function makeEditKeyHandler(guest: EnrichedGuest) {
    return (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') { e.preventDefault(); commitEdit(guest) }
      if (e.key === 'Escape') cancelEdit()
    }
  }

  // ── Bulk result message ──────────────────────────────────────────────────

  function BulkResultBanner({ r }: { r: BulkResult }) {
    const total = r.sent + r.failed + r.skipped

    if (total === 0) {
      return (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          No pending guests to send to.
        </p>
      )
    }

    if (r.sent > 0 && r.failed === 0 && r.skipped === 0) {
      return (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Sent {r.sent} RSVP invite{r.sent !== 1 ? 's' : ''}.
        </p>
      )
    }

    if (r.failed > 0) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
          <p className="text-sm font-medium text-slate-800">
            Sent {r.sent}
            {' · '}
            <span className="text-amber-700">Failed {r.failed}</span>
            {r.skipped > 0 && ` · Skipped ${r.skipped}`}
          </p>
          <p className="text-xs text-slate-500">
            Failures may include emails rejected by the email provider (e.g. unverified domains in test mode).
          </p>
        </div>
      )
    }

    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        Skipped {r.skipped} guest{r.skipped !== 1 ? 's' : ''} (no email or invalid address).
      </p>
    )
  }

  // ── Plus-one combined cell ───────────────────────────────────────────────

  function PlusOneCell({ guest }: { guest: EnrichedGuest }) {
    const bringingDisabled =
      pendingId === guest.id ||
      !guest.plus_one_allowed ||
      guest.rsvp_status === 'declined'

    const bringingTitle = !guest.plus_one_allowed
      ? 'Planner must enable +1 first'
      : guest.rsvp_status === 'declined'
        ? 'Guest is declined'
        : undefined

    return (
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={guest.plus_one_allowed}
            onChange={() => handlePlusOneAllowedToggle(guest)}
            disabled={pendingId === guest.id}
            className="h-3.5 w-3.5 accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          />
          Allowed
        </label>
        <label
          className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none"
          title={bringingTitle}
        >
          <input
            type="checkbox"
            checked={guest.plus_one}
            onChange={() => handlePlusOneToggle(guest)}
            disabled={bringingDisabled}
            className="h-3.5 w-3.5 accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          />
          Bringing
        </label>
      </div>
    )
  }

  // ── Actions dropdown ─────────────────────────────────────────────────────

  function ActionsMenu({ guest }: { guest: EnrichedGuest }) {
    const isBusy = pendingId === guest.id || sendingId === guest.id || clearPending
    const hasEmail = Boolean(guest.email?.trim())
    const hasToken = Boolean(guest.rsvp_token)

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={isBusy}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md p-0 text-slate-400 transition-colors hover:bg-accent hover:text-slate-700 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            disabled={!hasEmail || sendingId === guest.id}
            onClick={() => hasEmail && handleSendRsvp(guest)}
            title={!hasEmail ? 'Add email first' : undefined}
          >
            {hasToken ? 'Resend RSVP' : 'Send RSVP'}
          </DropdownMenuItem>

          {hasToken && (
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                setClearTarget({ id: guest.id, first_name: guest.first_name, last_name: guest.last_name })
              }
            >
              Clear RSVP link
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            onClick={() =>
              setDeleteTarget({ id: guest.id, first_name: guest.first_name, last_name: guest.last_name })
            }
          >
            Delete guest
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── RSVP deadline section ── */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-4 w-4 text-slate-500" />
          <p className="text-sm font-semibold text-slate-800">RSVP deadline</p>
        </div>

        {editingDeadline ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={deadlineInputValue}
                onChange={(e) => setDeadlineInputValue(e.target.value)}
                disabled={deadlinePending}
                className="h-8 w-44 text-sm"
              />
              <Button
                size="sm"
                onClick={saveDeadline}
                disabled={deadlinePending}
                className="h-8 bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {deadlinePending ? 'Saving…' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={cancelDeadlineEdit}
                disabled={deadlinePending}
                className="h-8"
              >
                Cancel
              </Button>
            </div>
            {deadlineError && <p className="text-xs text-red-600">{deadlineError}</p>}
          </div>
        ) : deadlineDisplay ? (
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-700">
                RSVP deadline: <strong>{deadlineDisplay}</strong>
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingDeadline(true)}
                disabled={deadlinePending}
                className="h-7 text-xs"
              >
                Change
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={clearDeadline}
                disabled={deadlinePending}
                className="h-7 text-xs text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
              >
                {deadlinePending ? 'Clearing…' : 'Clear'}
              </Button>
            </div>
            {deadlineError && <p className="text-xs text-red-600">{deadlineError}</p>}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-400 italic">No RSVP deadline set</p>
            <button
              type="button"
              onClick={() => setEditingDeadline(true)}
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Add deadline
            </button>
          </div>
        )}
      </div>

      {/* ── Bulk send section ── */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Send RSVP emails</p>

        <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includePreviouslySent}
            onChange={(e) => setIncludePreviouslySent(e.target.checked)}
            className="h-4 w-4 accent-indigo-600"
          />
          Include previously-sent guests
        </label>

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            {includePreviouslySent
              ? sendableCount > 0
                ? `${sendableCount} pending guest${sendableCount !== 1 ? 's' : ''} with an email address`
                : 'No pending guests with email addresses'
              : sendableCount > 0
                ? `${sendableCount} pending guest${sendableCount !== 1 ? 's' : ''} who haven't received an invite yet`
                : "No pending guests who haven't received an invite yet"}
          </p>
          <Button
            size="sm"
            onClick={() => { setBulkResult(null); setBulkError(null); setBulkDialogOpen(true) }}
            disabled={sendableCount === 0}
            className="shrink-0 bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Send to all pending
          </Button>
        </div>
      </div>

      {/* Bulk result / error banners */}
      {bulkResult && <BulkResultBanner r={bulkResult} />}
      {bulkError && <p className="text-sm text-red-600">{bulkError}</p>}

      {/* ── Summary stats bar ── */}
      {summary === null ? (
        <p className="text-sm text-slate-500">No guests yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            { label: 'Total', value: summary.total },
            { label: 'Pending', value: summary.pending },
            { label: 'Declined', value: summary.declined },
            { label: 'Responded', value: summary.responded },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-white border border-slate-200 p-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{label}</p>
            </div>
          ))}
          <div className="rounded-lg bg-white border border-slate-200 p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{summary.attending}</p>
            <p className="mt-0.5 text-xs text-slate-500">Attending</p>
            {summary.attendingIncludingPlusOnes > summary.attending && (
              <p className="mt-0.5 text-xs text-emerald-600">
                +{summary.attendingIncludingPlusOnes - summary.attending} with plus-ones
              </p>
            )}
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">
              {guests.filter((g) => g.dietary_notes && g.dietary_notes.trim()).length}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Dietary notes</p>
          </div>
        </div>
      )}

      {/* ── Controls row ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search guests…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => { setAdding(true); setAddForm(EMPTY_ADD_FORM) }}
          disabled={adding}
          className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add guest
        </Button>
      </div>

      {/* ── Slide-down add panel ── */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          adding ? 'max-h-[560px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-800">New guest</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* First name */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                First name <span className="text-red-500">*</span>
              </label>
              <Input
                autoFocus
                value={addForm.first_name}
                onChange={(e) => setAddForm((f) => ({ ...f, first_name: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Escape') cancelAdd() }}
                placeholder="First name"
                className="h-8 text-sm"
                disabled={addForm.pending}
              />
            </div>

            {/* Last name */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Last name <span className="text-red-500">*</span>
              </label>
              <Input
                value={addForm.last_name}
                onChange={(e) => setAddForm((f) => ({ ...f, last_name: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Escape') cancelAdd() }}
                placeholder="Last name"
                className="h-8 text-sm"
                disabled={addForm.pending}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
              <Input
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Escape') cancelAdd() }}
                placeholder="email@example.com"
                className="h-8 text-sm"
                disabled={addForm.pending}
              />
            </div>

            {/* RSVP status */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">RSVP status</label>
              <select
                value={addForm.rsvp_status}
                onChange={(e) => {
                  const status = e.target.value as GuestRsvpStatus
                  setAddForm((f) => ({
                    ...f,
                    rsvp_status: status,
                    plus_one: status === 'declined' ? false : f.plus_one,
                  }))
                }}
                disabled={addForm.pending}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="attending">Attending</option>
                <option value="declined">Declined</option>
              </select>
            </div>

            {/* +1 allowed */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="add-plus-one-allowed"
                checked={addForm.plus_one_allowed}
                onChange={(e) => {
                  const allowed = e.target.checked
                  setAddForm((f) => ({
                    ...f,
                    plus_one_allowed: allowed,
                    plus_one: allowed ? f.plus_one : false,
                  }))
                }}
                disabled={addForm.pending}
                className="h-4 w-4 accent-indigo-600"
              />
              <label htmlFor="add-plus-one-allowed" className="text-sm text-slate-700 cursor-pointer select-none">
                +1 allowed
              </label>
            </div>

            {/* Bringing +1 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="add-plus-one"
                checked={addForm.plus_one}
                onChange={(e) => setAddForm((f) => ({ ...f, plus_one: e.target.checked }))}
                disabled={addForm.pending || !addForm.plus_one_allowed || addForm.rsvp_status === 'declined'}
                className="h-4 w-4 accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <label
                htmlFor="add-plus-one"
                className="text-sm text-slate-700 cursor-pointer select-none"
                title={
                  !addForm.plus_one_allowed
                    ? 'Enable +1 allowed first'
                    : addForm.rsvp_status === 'declined'
                      ? 'Guest is declined'
                      : undefined
                }
              >
                Bringing +1
              </label>
            </div>

            {/* Dietary notes — full width */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Dietary notes</label>
              <Input
                value={addForm.dietary_notes}
                onChange={(e) => setAddForm((f) => ({ ...f, dietary_notes: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Escape') cancelAdd() }}
                placeholder="e.g. vegetarian, nut allergy"
                className="h-8 text-sm"
                disabled={addForm.pending}
              />
            </div>
          </div>

          {addForm.error && <p className="text-sm text-red-600">{addForm.error}</p>}

          <div className="flex gap-2">
            <Button
              onClick={submitAdd}
              disabled={addForm.pending || !addForm.first_name.trim() || !addForm.last_name.trim()}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {addForm.pending ? 'Saving…' : 'Save guest'}
            </Button>
            <Button variant="outline" onClick={cancelAdd} disabled={addForm.pending}>
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-slate-200">
        {RSVP_FILTERS.map(({ value, label }) => {
          const active = statusFilter === value
          return (
            <button
              key={value}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {label} ({tabCounts[value]})
            </button>
          )
        })}
      </div>

      {/* ── Desktop table — 8 columns ── */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>First name</TableHead>
              <TableHead>Last name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>RSVP</TableHead>
              <TableHead>Last sent</TableHead>
              <TableHead>Plus-one</TableHead>
              <TableHead>Dietary notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-slate-500">
                  {guests.length === 0
                    ? 'No guests yet. Click "Add guest" above to get started.'
                    : 'No guests match this filter.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((guest) => (
                <>
                  <TableRow
                    key={guest.id}
                    className={pendingId === guest.id ? 'opacity-60' : ''}
                  >
                    {/* First name */}
                    <TableCell>
                      {editState?.guestId === guest.id && editState.field === 'first_name' ? (
                        <Input
                          autoFocus
                          value={editState.value}
                          onChange={(e) => setEditState((s) => s && { ...s, value: e.target.value })}
                          onKeyDown={makeEditKeyHandler(guest)}
                          className="h-7 w-28 text-sm"
                          disabled={pendingId === guest.id}
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(guest, 'first_name')}
                          className="text-left text-sm font-medium text-slate-900 hover:text-indigo-600"
                          disabled={pendingId === guest.id}
                          title="Click to edit"
                        >
                          {guest.first_name}
                        </button>
                      )}
                    </TableCell>

                    {/* Last name */}
                    <TableCell>
                      {editState?.guestId === guest.id && editState.field === 'last_name' ? (
                        <Input
                          autoFocus
                          value={editState.value}
                          onChange={(e) => setEditState((s) => s && { ...s, value: e.target.value })}
                          onKeyDown={makeEditKeyHandler(guest)}
                          className="h-7 w-28 text-sm"
                          disabled={pendingId === guest.id}
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(guest, 'last_name')}
                          className="text-left text-sm font-medium text-slate-900 hover:text-indigo-600"
                          disabled={pendingId === guest.id}
                          title="Click to edit"
                        >
                          {guest.last_name}
                        </button>
                      )}
                    </TableCell>

                    {/* Email */}
                    <TableCell>
                      {editState?.guestId === guest.id && editState.field === 'email' ? (
                        <Input
                          autoFocus
                          value={editState.value}
                          onChange={(e) => setEditState((s) => s && { ...s, value: e.target.value })}
                          onKeyDown={makeEditKeyHandler(guest)}
                          className="h-7 w-40 text-sm"
                          disabled={pendingId === guest.id}
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(guest, 'email')}
                          className="text-left text-sm hover:text-indigo-600"
                          disabled={pendingId === guest.id}
                          title="Click to edit"
                        >
                          {guest.email ?? (
                            <span className="italic text-slate-400">Add email</span>
                          )}
                        </button>
                      )}
                    </TableCell>

                    {/* RSVP */}
                    <TableCell>
                      <div className="space-y-1">
                        <select
                          value={guest.rsvp_status}
                          onChange={(e) => handleRsvpChange(guest, e.target.value as GuestRsvpStatus)}
                          disabled={pendingId === guest.id}
                          className="h-7 rounded-md border border-input bg-background px-2 text-sm"
                        >
                          <option value="pending">Pending</option>
                          <option value="attending">Attending</option>
                          <option value="declined">Declined</option>
                        </select>
                        {guest.rsvp_responded_at && (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Responded
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Last sent */}
                    <TableCell>
                      {guest.rsvp_sent_at_display ? (
                        <span className="text-sm text-slate-700">{guest.rsvp_sent_at_display}</span>
                      ) : (
                        <span className="text-sm italic text-slate-400">Not sent</span>
                      )}
                    </TableCell>

                    {/* Plus-one */}
                    <TableCell>
                      <PlusOneCell guest={guest} />
                    </TableCell>

                    {/* Dietary notes */}
                    <TableCell>
                      {editState?.guestId === guest.id && editState.field === 'dietary_notes' ? (
                        <Input
                          autoFocus
                          value={editState.value}
                          onChange={(e) => setEditState((s) => s && { ...s, value: e.target.value })}
                          onKeyDown={makeEditKeyHandler(guest)}
                          className="h-7 w-36 text-sm"
                          disabled={pendingId === guest.id}
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(guest, 'dietary_notes')}
                          className="text-left text-sm hover:text-indigo-600"
                          disabled={pendingId === guest.id}
                          title="Click to edit"
                        >
                          {guest.dietary_notes ?? (
                            <span className="italic text-slate-400">Add notes</span>
                          )}
                        </button>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <ActionsMenu guest={guest} />
                    </TableCell>
                  </TableRow>

                  {/* Per-row errors */}
                  {(rowError?.guestId === guest.id || sendRowError?.guestId === guest.id) && (
                    <TableRow key={`${guest.id}-err`}>
                      <TableCell colSpan={8} className="py-1">
                        <p className="text-xs text-red-600">
                          {rowError?.guestId === guest.id ? rowError.message : sendRowError?.message}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Mobile cards ── */}
      <div className="space-y-3 sm:hidden">
        {filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            {guests.length === 0
              ? 'No guests yet. Click "Add guest" above to get started.'
              : 'No guests match this filter.'}
          </p>
        ) : (
          filtered.map((guest) => (
            <div
              key={guest.id}
              className={`rounded-lg border border-slate-200 bg-white p-4 ${
                pendingId === guest.id ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {/* First name */}
                  {editState?.guestId === guest.id && editState.field === 'first_name' ? (
                    <Input
                      autoFocus
                      value={editState.value}
                      onChange={(e) => setEditState((s) => s && { ...s, value: e.target.value })}
                      onKeyDown={makeEditKeyHandler(guest)}
                      className="h-7 text-sm"
                      disabled={pendingId === guest.id}
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(guest, 'first_name')}
                      className="text-left font-medium text-slate-900 hover:text-indigo-600"
                      disabled={pendingId === guest.id}
                    >
                      {guest.first_name}
                    </button>
                  )}

                  {/* Last name */}
                  {editState?.guestId === guest.id && editState.field === 'last_name' ? (
                    <Input
                      autoFocus
                      value={editState.value}
                      onChange={(e) => setEditState((s) => s && { ...s, value: e.target.value })}
                      onKeyDown={makeEditKeyHandler(guest)}
                      className="mt-0.5 h-7 text-sm"
                      disabled={pendingId === guest.id}
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(guest, 'last_name')}
                      className="mt-0.5 block text-left font-medium text-slate-900 hover:text-indigo-600"
                      disabled={pendingId === guest.id}
                    >
                      {guest.last_name}
                    </button>
                  )}

                  {/* Email */}
                  {editState?.guestId === guest.id && editState.field === 'email' ? (
                    <Input
                      autoFocus
                      value={editState.value}
                      onChange={(e) => setEditState((s) => s && { ...s, value: e.target.value })}
                      onKeyDown={makeEditKeyHandler(guest)}
                      className="mt-1 h-7 text-sm"
                      disabled={pendingId === guest.id}
                    />
                  ) : (
                    <button
                      onClick={() => startEdit(guest, 'email')}
                      className="mt-0.5 block text-left text-sm text-slate-500 hover:text-indigo-600"
                      disabled={pendingId === guest.id}
                    >
                      {guest.email ?? (
                        <span className="italic text-slate-400">Add email</span>
                      )}
                    </button>
                  )}
                </div>

                <ActionsMenu guest={guest} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <select
                  value={guest.rsvp_status}
                  onChange={(e) => handleRsvpChange(guest, e.target.value as GuestRsvpStatus)}
                  disabled={pendingId === guest.id}
                  className="h-7 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="attending">Attending</option>
                  <option value="declined">Declined</option>
                </select>

                {guest.rsvp_responded_at && (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Responded
                  </span>
                )}
              </div>

              {/* Last sent */}
              <p className="mt-2 text-xs text-slate-500">
                Last sent:{' '}
                {guest.rsvp_sent_at_display ? (
                  <span className="text-slate-700">{guest.rsvp_sent_at_display}</span>
                ) : (
                  <span className="italic text-slate-400">Not sent</span>
                )}
              </p>

              {/* Plus-one */}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={guest.plus_one_allowed}
                    onChange={() => handlePlusOneAllowedToggle(guest)}
                    disabled={pendingId === guest.id}
                    className="h-4 w-4 accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  +1 allowed
                </label>
                <label
                  className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer select-none"
                  title={
                    !guest.plus_one_allowed
                      ? 'Planner must enable +1 first'
                      : guest.rsvp_status === 'declined'
                        ? 'Guest is declined'
                        : undefined
                  }
                >
                  <input
                    type="checkbox"
                    checked={guest.plus_one}
                    onChange={() => handlePlusOneToggle(guest)}
                    disabled={
                      pendingId === guest.id ||
                      !guest.plus_one_allowed ||
                      guest.rsvp_status === 'declined'
                    }
                    className="h-4 w-4 accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  Bringing +1
                </label>
              </div>

              {/* Dietary notes */}
              <div className="mt-2">
                {editState?.guestId === guest.id && editState.field === 'dietary_notes' ? (
                  <Input
                    autoFocus
                    value={editState.value}
                    onChange={(e) => setEditState((s) => s && { ...s, value: e.target.value })}
                    onKeyDown={makeEditKeyHandler(guest)}
                    placeholder="Dietary notes"
                    className="h-7 text-sm"
                    disabled={pendingId === guest.id}
                  />
                ) : (
                  <button
                    onClick={() => startEdit(guest, 'dietary_notes')}
                    className="text-left text-sm text-slate-500 hover:text-indigo-600"
                    disabled={pendingId === guest.id}
                  >
                    {guest.dietary_notes ?? (
                      <span className="italic text-slate-400">Add dietary notes</span>
                    )}
                  </button>
                )}
              </div>

              {(sendRowError?.guestId === guest.id || rowError?.guestId === guest.id) && (
                <p className="mt-2 text-xs text-red-600">
                  {sendRowError?.guestId === guest.id ? sendRowError.message : rowError?.message}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Delete confirmation ── */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove guest?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{' '}
              <strong>
                {deleteTarget ? `${deleteTarget.first_name} ${deleteTarget.last_name}` : ''}
              </strong>{' '}
              from the guest list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Clear RSVP token confirmation ── */}
      <AlertDialog
        open={clearTarget !== null}
        onOpenChange={(open) => !open && setClearTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear RSVP link?</AlertDialogTitle>
            <AlertDialogDescription>
              Clear the RSVP link for{' '}
              <strong>
                {clearTarget ? `${clearTarget.first_name} ${clearTarget.last_name}` : ''}
              </strong>
              ? This invalidates the previous link and resets the send history. They won&apos;t be able
              to use the previous link anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearToken}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Clear link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk send confirmation ── */}
      <AlertDialog
        open={bulkDialogOpen}
        onOpenChange={(open) => { if (!bulkPending) setBulkDialogOpen(open) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send RSVP emails?</AlertDialogTitle>
            <AlertDialogDescription>
              {includePreviouslySent
                ? "This will email RSVP invites to all pending guests with a valid email address, including those who've already received one. Continue?"
                : "This will email RSVP invites to all pending guests who have a valid email address and haven't received one yet. Continue?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {bulkResult && (
            <div className="px-6 pb-2">
              <BulkResultBanner r={bulkResult} />
            </div>
          )}
          <AlertDialogFooter>
            {bulkResult ? (
              <AlertDialogCancel onClick={() => setBulkDialogOpen(false)}>Close</AlertDialogCancel>
            ) : (
              <>
                <AlertDialogCancel disabled={bulkPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkSend}
                  disabled={bulkPending}
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {bulkPending ? 'Sending…' : 'Send emails'}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

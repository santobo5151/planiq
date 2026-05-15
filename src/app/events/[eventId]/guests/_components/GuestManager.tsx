'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
} from '@/app/events/[eventId]/actions'
import type { Guest, GuestRsvpStatus } from '@/types/database'
import type { GuestSummary } from '@/services/guests'

// ── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | GuestRsvpStatus

interface AddForm {
  first_name: string
  last_name: string
  email: string
  rsvp_status: GuestRsvpStatus
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

interface GuestManagerProps {
  eventId: string
  initialGuests: Guest[]
  initialSummary: GuestSummary | null
}

// ── Constants ────────────────────────────────────────────────────────────────

const EMPTY_ADD_FORM: AddForm = {
  first_name: '',
  last_name: '',
  email: '',
  rsvp_status: 'pending',
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

const RSVP_LABELS: Record<GuestRsvpStatus, string> = {
  pending: 'Pending',
  attending: 'Attending',
  declined: 'Declined',
}

// ── Component ────────────────────────────────────────────────────────────────

export function GuestManager({
  eventId,
  initialGuests,
  initialSummary,
}: GuestManagerProps) {
  const router = useRouter()

  const [guests, setGuests] = useState<Guest[]>(initialGuests)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD_FORM)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [rowError, setRowError] = useState<{ guestId: string; message: string } | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; first_name: string; last_name: string } | null>(null)

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

  // ── Handlers ────────────────────────────────────────────────────────────

  function startEdit(guest: Guest, field: EditState['field']) {
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

  async function commitEdit(guest: Guest) {
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

  async function handleRsvpChange(guest: Guest, newStatus: GuestRsvpStatus) {
    if (pendingId === guest.id) return
    setRowError(null)

    const optimistic: Guest = {
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

  async function handlePlusOneToggle(guest: Guest) {
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

  async function submitAdd() {
    if (addForm.pending) return
    setAddForm((f) => ({ ...f, error: null, pending: true }))

    const result = await createGuestAction(eventId, {
      first_name: addForm.first_name,
      last_name: addForm.last_name,
      email: addForm.email || null,
      rsvp_status: addForm.rsvp_status,
      plus_one: addForm.plus_one,
      dietary_notes: addForm.dietary_notes || null,
    })

    if (result.success) {
      setGuests((prev) => [...prev, result.guest])
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

  function makeEditKeyHandler(guest: Guest) {
    return (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') { e.preventDefault(); commitEdit(guest) }
      if (e.key === 'Escape') cancelEdit()
    }
  }

  function handleAddKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); submitAdd() }
    if (e.key === 'Escape') cancelAdd()
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* A) Summary stats bar */}
      {initialSummary === null ? (
        <p className="text-sm text-slate-500">No guests yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: 'Total', value: initialSummary.total },
            { label: 'Pending', value: initialSummary.pending },
            { label: 'Declined', value: initialSummary.declined },
            { label: 'Dietary notes', value: initialSummary.withDietaryNotes },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-white border border-slate-200 p-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="mt-0.5 text-xs text-slate-500">{label}</p>
            </div>
          ))}
          {/* Attending — with optional plus-ones line */}
          <div className="rounded-lg bg-white border border-slate-200 p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{initialSummary.attending}</p>
            <p className="mt-0.5 text-xs text-slate-500">Attending</p>
            {initialSummary.attendingIncludingPlusOnes > initialSummary.attending && (
              <p className="mt-0.5 text-xs text-emerald-600">
                +{initialSummary.attendingIncludingPlusOnes - initialSummary.attending} with plus-ones
              </p>
            )}
          </div>
        </div>
      )}

      {/* B) Controls row */}
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

      {/* Filter tabs */}
      <div
        role="tablist"
        className="flex flex-wrap gap-1 border-b border-slate-200"
      >
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

      {/* C) Desktop table */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>First name</TableHead>
              <TableHead>Last name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>RSVP</TableHead>
              <TableHead className="text-center">+1</TableHead>
              <TableHead>Dietary notes</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Inline add row */}
            {adding && (
              <TableRow>
                <TableCell>
                  <Input
                    autoFocus
                    value={addForm.first_name}
                    onChange={(e) => setAddForm((f) => ({ ...f, first_name: e.target.value }))}
                    onKeyDown={handleAddKeyDown}
                    placeholder="First name *"
                    className="h-7 w-32 text-sm"
                    disabled={addForm.pending}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={addForm.last_name}
                    onChange={(e) => setAddForm((f) => ({ ...f, last_name: e.target.value }))}
                    onKeyDown={handleAddKeyDown}
                    placeholder="Last name *"
                    className="h-7 w-32 text-sm"
                    disabled={addForm.pending}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={addForm.email}
                    onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                    onKeyDown={handleAddKeyDown}
                    placeholder="Email"
                    className="h-7 w-40 text-sm"
                    disabled={addForm.pending}
                  />
                </TableCell>
                <TableCell>
                  <select
                    value={addForm.rsvp_status}
                    onChange={(e) =>
                      setAddForm((f) => ({
                        ...f,
                        rsvp_status: e.target.value as GuestRsvpStatus,
                      }))
                    }
                    disabled={addForm.pending}
                    className="h-7 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="attending">Attending</option>
                    <option value="declined">Declined</option>
                  </select>
                </TableCell>
                <TableCell className="text-center">
                  <input
                    type="checkbox"
                    checked={addForm.plus_one}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, plus_one: e.target.checked }))
                    }
                    disabled={addForm.pending}
                    className="h-4 w-4 cursor-pointer accent-indigo-600"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={addForm.dietary_notes}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, dietary_notes: e.target.value }))
                    }
                    onKeyDown={handleAddKeyDown}
                    placeholder="Dietary notes"
                    className="h-7 w-36 text-sm"
                    disabled={addForm.pending}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      onClick={submitAdd}
                      disabled={addForm.pending || !addForm.first_name.trim() || !addForm.last_name.trim()}
                      className="h-7 bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      {addForm.pending ? 'Adding…' : 'Add'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelAdd}
                      disabled={addForm.pending}
                      className="h-7"
                    >
                      Cancel
                    </Button>
                  </div>
                  {addForm.error && (
                    <p className="mt-1 text-xs text-red-600">{addForm.error}</p>
                  )}
                </TableCell>
              </TableRow>
            )}

            {/* Guest rows */}
            {filtered.length === 0 && !adding ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-slate-500">
                  {guests.length === 0
                    ? 'No guests yet. Add your first guest above.'
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
                          onChange={(e) =>
                            setEditState((s) => s && { ...s, value: e.target.value })
                          }
                          onKeyDown={makeEditKeyHandler(guest)}
                          className="h-7 w-28 text-sm"
                          disabled={pendingId === guest.id}
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(guest, 'first_name')}
                          className="text-left text-sm font-medium text-slate-900 hover:text-indigo-600"
                          disabled={pendingId === guest.id}
                          title="Click to edit first name"
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
                          onChange={(e) =>
                            setEditState((s) => s && { ...s, value: e.target.value })
                          }
                          onKeyDown={makeEditKeyHandler(guest)}
                          className="h-7 w-28 text-sm"
                          disabled={pendingId === guest.id}
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(guest, 'last_name')}
                          className="text-left text-sm font-medium text-slate-900 hover:text-indigo-600"
                          disabled={pendingId === guest.id}
                          title="Click to edit last name"
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
                          onChange={(e) =>
                            setEditState((s) => s && { ...s, value: e.target.value })
                          }
                          onKeyDown={makeEditKeyHandler(guest)}
                          className="h-7 w-40 text-sm"
                          disabled={pendingId === guest.id}
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(guest, 'email')}
                          className="text-left text-sm hover:text-indigo-600"
                          disabled={pendingId === guest.id}
                          title="Click to edit email"
                        >
                          {guest.email ?? (
                            <span className="italic text-slate-400">Add email</span>
                          )}
                        </button>
                      )}
                    </TableCell>

                    {/* RSVP */}
                    <TableCell>
                      <select
                        value={guest.rsvp_status}
                        onChange={(e) =>
                          handleRsvpChange(guest, e.target.value as GuestRsvpStatus)
                        }
                        disabled={pendingId === guest.id}
                        className="h-7 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="attending">Attending</option>
                        <option value="declined">Declined</option>
                      </select>
                    </TableCell>

                    {/* Plus-one */}
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={guest.plus_one}
                        onChange={() => handlePlusOneToggle(guest)}
                        disabled={pendingId === guest.id || guest.rsvp_status === 'declined'}
                        className="h-4 w-4 accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </TableCell>

                    {/* Dietary notes */}
                    <TableCell>
                      {editState?.guestId === guest.id &&
                      editState.field === 'dietary_notes' ? (
                        <Input
                          autoFocus
                          value={editState.value}
                          onChange={(e) =>
                            setEditState((s) => s && { ...s, value: e.target.value })
                          }
                          onKeyDown={makeEditKeyHandler(guest)}
                          className="h-7 w-36 text-sm"
                          disabled={pendingId === guest.id}
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(guest, 'dietary_notes')}
                          className="text-left text-sm hover:text-indigo-600"
                          disabled={pendingId === guest.id}
                          title="Click to edit dietary notes"
                        >
                          {guest.dietary_notes ?? (
                            <span className="italic text-slate-400">Add notes</span>
                          )}
                        </button>
                      )}
                    </TableCell>

                    {/* Delete */}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDeleteTarget({ id: guest.id, first_name: guest.first_name, last_name: guest.last_name })
                        }
                        disabled={pendingId === guest.id}
                        className="h-7 w-7 p-0 text-slate-300 hover:text-red-500"
                        title="Delete guest"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>

                  {/* Per-row error */}
                  {rowError?.guestId === guest.id && (
                    <TableRow key={`${guest.id}-err`}>
                      <TableCell colSpan={7} className="py-1">
                        <p className="text-xs text-red-600">{rowError.message}</p>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* C) Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {/* Inline add card */}
        {adding && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">New guest</p>
            <Input
              autoFocus
              value={addForm.first_name}
              onChange={(e) => setAddForm((f) => ({ ...f, first_name: e.target.value }))}
              onKeyDown={handleAddKeyDown}
              placeholder="First name *"
              className="h-8 text-sm"
              disabled={addForm.pending}
            />
            <Input
              value={addForm.last_name}
              onChange={(e) => setAddForm((f) => ({ ...f, last_name: e.target.value }))}
              onKeyDown={handleAddKeyDown}
              placeholder="Last name *"
              className="h-8 text-sm"
              disabled={addForm.pending}
            />
            <Input
              value={addForm.email}
              onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
              onKeyDown={handleAddKeyDown}
              placeholder="Email"
              className="h-8 text-sm"
              disabled={addForm.pending}
            />
            <div className="flex gap-3">
              <select
                value={addForm.rsvp_status}
                onChange={(e) =>
                  setAddForm((f) => ({
                    ...f,
                    rsvp_status: e.target.value as GuestRsvpStatus,
                  }))
                }
                disabled={addForm.pending}
                className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="attending">Attending</option>
                <option value="declined">Declined</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={addForm.plus_one}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, plus_one: e.target.checked }))
                  }
                  disabled={addForm.pending}
                  className="h-4 w-4 accent-indigo-600"
                />
                +1
              </label>
            </div>
            <Input
              value={addForm.dietary_notes}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, dietary_notes: e.target.value }))
              }
              onKeyDown={handleAddKeyDown}
              placeholder="Dietary notes"
              className="h-8 text-sm"
              disabled={addForm.pending}
            />
            {addForm.error && (
              <p className="text-sm text-red-600">{addForm.error}</p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={submitAdd}
                disabled={addForm.pending || !addForm.first_name.trim() || !addForm.last_name.trim()}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {addForm.pending ? 'Adding…' : 'Add'}
              </Button>
              <Button size="sm" variant="outline" onClick={cancelAdd} disabled={addForm.pending}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {filtered.length === 0 && !adding ? (
          <p className="py-4 text-center text-sm text-slate-500">
            {guests.length === 0
              ? 'No guests yet. Add your first guest above.'
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
                      onChange={(e) =>
                        setEditState((s) => s && { ...s, value: e.target.value })
                      }
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
                      onChange={(e) =>
                        setEditState((s) => s && { ...s, value: e.target.value })
                      }
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
                      onChange={(e) =>
                        setEditState((s) => s && { ...s, value: e.target.value })
                      }
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

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget({ id: guest.id, first_name: guest.first_name, last_name: guest.last_name })}
                  disabled={pendingId === guest.id}
                  className="h-7 w-7 shrink-0 p-0 text-slate-300 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <select
                  value={guest.rsvp_status}
                  onChange={(e) =>
                    handleRsvpChange(guest, e.target.value as GuestRsvpStatus)
                  }
                  disabled={pendingId === guest.id}
                  className="h-7 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="attending">Attending</option>
                  <option value="declined">Declined</option>
                </select>

                <label className="flex items-center gap-1.5 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={guest.plus_one}
                    onChange={() => handlePlusOneToggle(guest)}
                    disabled={pendingId === guest.id || guest.rsvp_status === 'declined'}
                    className="h-4 w-4 accent-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  +1 guest
                </label>
              </div>

              {/* Dietary notes */}
              <div className="mt-2">
                {editState?.guestId === guest.id &&
                editState.field === 'dietary_notes' ? (
                  <Input
                    autoFocus
                    value={editState.value}
                    onChange={(e) =>
                      setEditState((s) => s && { ...s, value: e.target.value })
                    }
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

              {rowError?.guestId === guest.id && (
                <p className="mt-2 text-xs text-red-600">{rowError.message}</p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation dialog */}
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
    </div>
  )
}

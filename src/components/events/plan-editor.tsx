'use client'

import { useState, useTransition, useRef, useEffect, type KeyboardEvent } from 'react'
import { Pencil, Plus, Trash2, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { updatePlanAction } from '@/app/events/[eventId]/actions'
import { GeneratePlanButton } from '@/components/events/generate-plan-button'
import { BudgetGenerateButton } from '@/components/events/budget-generate-button'
import type { GeneratedPlan } from '@/types/database'

// ── Types ────────────────────────────────────────────────────────────────────

type TlItem = GeneratedPlan['timeline'][number]
type VItem = GeneratedPlan['vendor_categories'][number]
type RItem = GeneratedPlan['recommendations'][number]

type TlEditState = { idx: number; field: 'time' | 'activity' | 'notes'; error: string | null }
type VEditState = { idx: number; field: 'name' | 'description' | 'estimated_cost'; error: string | null }
type REditState = { idx: number; field: 'category' | 'suggestion' | 'reason'; error: string | null }

// ── Priority styles ──────────────────────────────────────────────────────────

const PRIORITY_VARIANTS: Record<VItem['priority'], 'destructive' | 'warning' | 'secondary'> = {
  essential: 'destructive',
  recommended: 'warning',
  optional: 'secondary',
}

const PRIORITY_CYCLE: Record<VItem['priority'], VItem['priority']> = {
  essential: 'recommended',
  recommended: 'optional',
  optional: 'essential',
}

// ── InlineInput ──────────────────────────────────────────────────────────────

interface InlineInputProps {
  initialValue: string
  placeholder?: string
  error: string | null
  disabled?: boolean
  onCommit: (v: string) => void
  onCancel: () => void
}

function InlineInput({
  initialValue,
  placeholder,
  error,
  disabled,
  onCommit,
  onCancel,
}: InlineInputProps) {
  const [value, setValue] = useState(initialValue)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onCommit(value)
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <Input
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-7 px-2 py-0 text-sm"
          disabled={disabled}
        />
        <button
          onClick={() => onCommit(value)}
          disabled={disabled}
          className="shrink-0 text-emerald-600 hover:text-emerald-700 disabled:opacity-40"
          title="Save (Enter)"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onCancel}
          disabled={disabled}
          className="shrink-0 text-slate-400 hover:text-slate-600"
          title="Cancel (Escape)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ── InlineTextarea ───────────────────────────────────────────────────────────

interface InlineTextareaProps {
  initialValue: string
  placeholder?: string
  error: string | null
  disabled?: boolean
  onCommit: (v: string) => void
  onCancel: () => void
}

function InlineTextarea({
  initialValue,
  placeholder,
  error,
  disabled,
  onCommit,
  onCancel,
}: InlineTextareaProps) {
  const [value, setValue] = useState(initialValue)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
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
    <div className="flex flex-col gap-2">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-h-[80px] text-sm"
        disabled={disabled}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onCommit(value)}
          disabled={disabled}
          className="bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={disabled}>
          Cancel
        </Button>
      </div>
      <p className="text-xs text-slate-400">Cmd/Ctrl+Enter to save · Escape to cancel</p>
    </div>
  )
}

// ── PlanEditor ───────────────────────────────────────────────────────────────

interface PlanEditorProps {
  eventId: string
  plan: {
    concept_summary: string | null
    timeline: unknown
    vendor_categories: unknown
    recommendations: unknown
  }
}

export function PlanEditor({ eventId, plan }: PlanEditorProps) {
  const initTimeline = (plan.timeline ?? []) as TlItem[]
  const initVendors = (plan.vendor_categories ?? []) as VItem[]
  const initRecs = (plan.recommendations ?? []) as RItem[]

  function flash(setter: (v: boolean) => void) {
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  // ── Concept state ─────────────────────────────────────────────────────────

  const [conceptText, setConceptText] = useState(plan.concept_summary ?? '')
  const [conceptEditing, setConceptEditing] = useState(false)
  const [conceptSaved, setConceptSaved] = useState(false)
  const [conceptError, setConceptError] = useState<string | null>(null)
  const [conceptPending, startConceptSave] = useTransition()

  function saveConceptText(text: string) {
    if (!text.trim()) {
      setConceptError('Concept summary cannot be empty')
      return
    }
    startConceptSave(async () => {
      const result = await updatePlanAction(eventId, { concept_summary: text.trim() })
      if (result.success) {
        setConceptText(text.trim())
        setConceptEditing(false)
        setConceptError(null)
        flash(setConceptSaved)
      } else {
        setConceptError(result.error)
      }
    })
  }

  // ── Timeline state ────────────────────────────────────────────────────────

  const [timeline, setTimeline] = useState<TlItem[]>(initTimeline)
  const [tlEdit, setTlEdit] = useState<TlEditState | null>(null)
  const [tlAddOpen, setTlAddOpen] = useState(false)
  const [tlAddForm, setTlAddForm] = useState({ time: '', activity: '', notes: '' })
  const [tlAddError, setTlAddError] = useState<string | null>(null)
  const [tlDeleteIdx, setTlDeleteIdx] = useState<number | null>(null)
  const [tlSaved, setTlSaved] = useState(false)
  const [tlPending, startTlSave] = useTransition()

  function commitTlEdit(idx: number, field: TlEditState['field'], value: string) {
    if (field !== 'notes' && !value.trim()) {
      setTlEdit((e) => e && { ...e, error: `${field === 'time' ? 'Time' : 'Activity'} cannot be empty` })
      return
    }
    const updated = timeline.map((item, i) =>
      i === idx ? { ...item, [field]: value.trim() } : item
    )
    startTlSave(async () => {
      const result = await updatePlanAction(eventId, { timeline: updated })
      if (result.success) {
        setTimeline(updated)
        setTlEdit(null)
        flash(setTlSaved)
      } else {
        setTlEdit((e) => e && { ...e, error: result.error })
      }
    })
  }

  function submitTlAdd() {
    if (!tlAddForm.time.trim() || !tlAddForm.activity.trim()) {
      setTlAddError('Time and activity are required')
      return
    }
    const newItem: TlItem = {
      time: tlAddForm.time.trim(),
      activity: tlAddForm.activity.trim(),
      notes: tlAddForm.notes.trim(),
    }
    const updated = [...timeline, newItem]
    startTlSave(async () => {
      const result = await updatePlanAction(eventId, { timeline: updated })
      if (result.success) {
        setTimeline(updated)
        setTlAddOpen(false)
        setTlAddForm({ time: '', activity: '', notes: '' })
        setTlAddError(null)
        flash(setTlSaved)
      } else {
        setTlAddError(result.error)
      }
    })
  }

  function executeTlDelete(idx: number) {
    const updated = timeline.filter((_, i) => i !== idx)
    startTlSave(async () => {
      const result = await updatePlanAction(eventId, { timeline: updated })
      if (result.success) {
        setTimeline(updated)
        flash(setTlSaved)
      }
    })
  }

  // ── Vendor state ──────────────────────────────────────────────────────────

  const [vendors, setVendors] = useState<VItem[]>(initVendors)
  const [vEdit, setVEdit] = useState<VEditState | null>(null)
  const [vAddOpen, setVAddOpen] = useState(false)
  const [vAddForm, setVAddForm] = useState({
    name: '',
    description: '',
    estimated_cost: '',
    priority: 'recommended' as VItem['priority'],
  })
  const [vAddError, setVAddError] = useState<string | null>(null)
  const [vDeleteIdx, setVDeleteIdx] = useState<number | null>(null)
  const [vSaved, setVSaved] = useState(false)
  const [vPending, startVSave] = useTransition()

  function cycleVendorPriority(idx: number) {
    const optimistic = vendors.map((v, i) =>
      i === idx ? { ...v, priority: PRIORITY_CYCLE[v.priority] } : v
    )
    setVendors(optimistic)
    startVSave(async () => {
      const result = await updatePlanAction(eventId, { vendor_categories: optimistic })
      if (!result.success) setVendors(vendors)
      else flash(setVSaved)
    })
  }

  function commitVEdit(idx: number, field: VEditState['field'], value: string) {
    if (field !== 'estimated_cost' && !value.trim()) {
      setVEdit((e) => e && {
        ...e,
        error: `${field === 'name' ? 'Name' : 'Description'} cannot be empty`,
      })
      return
    }
    const updated = vendors.map((v, i) =>
      i === idx ? { ...v, [field]: value.trim() } : v
    )
    startVSave(async () => {
      const result = await updatePlanAction(eventId, { vendor_categories: updated })
      if (result.success) {
        setVendors(updated)
        setVEdit(null)
        flash(setVSaved)
      } else {
        setVEdit((e) => e && { ...e, error: result.error })
      }
    })
  }

  function submitVAdd() {
    if (!vAddForm.name.trim() || !vAddForm.description.trim()) {
      setVAddError('Name and description are required')
      return
    }
    const newItem: VItem = {
      name: vAddForm.name.trim(),
      description: vAddForm.description.trim(),
      estimated_cost: vAddForm.estimated_cost.trim() || 'TBD',
      priority: vAddForm.priority,
    }
    const updated = [...vendors, newItem]
    startVSave(async () => {
      const result = await updatePlanAction(eventId, { vendor_categories: updated })
      if (result.success) {
        setVendors(updated)
        setVAddOpen(false)
        setVAddForm({ name: '', description: '', estimated_cost: '', priority: 'recommended' })
        setVAddError(null)
        flash(setVSaved)
      } else {
        setVAddError(result.error)
      }
    })
  }

  function executeVDelete(idx: number) {
    const updated = vendors.filter((_, i) => i !== idx)
    startVSave(async () => {
      const result = await updatePlanAction(eventId, { vendor_categories: updated })
      if (result.success) {
        setVendors(updated)
        flash(setVSaved)
      }
    })
  }

  // ── Recommendations state ─────────────────────────────────────────────────

  const [recs, setRecs] = useState<RItem[]>(initRecs)
  const [rEdit, setREdit] = useState<REditState | null>(null)
  const [rAddOpen, setRAddOpen] = useState(false)
  const [rAddForm, setRAddForm] = useState({ category: '', suggestion: '', reason: '' })
  const [rAddError, setRAddError] = useState<string | null>(null)
  const [rDeleteIdx, setRDeleteIdx] = useState<number | null>(null)
  const [rSaved, setRSaved] = useState(false)
  const [rPending, startRSave] = useTransition()

  function commitREdit(idx: number, field: REditState['field'], value: string) {
    if (!value.trim()) {
      const label =
        field === 'category' ? 'Category' : field === 'suggestion' ? 'Suggestion' : 'Reason'
      setREdit((e) => e && { ...e, error: `${label} cannot be empty` })
      return
    }
    const updated = recs.map((r, i) =>
      i === idx ? { ...r, [field]: value.trim() } : r
    )
    startRSave(async () => {
      const result = await updatePlanAction(eventId, { recommendations: updated })
      if (result.success) {
        setRecs(updated)
        setREdit(null)
        flash(setRSaved)
      } else {
        setREdit((e) => e && { ...e, error: result.error })
      }
    })
  }

  function submitRAdd() {
    if (!rAddForm.category.trim() || !rAddForm.suggestion.trim() || !rAddForm.reason.trim()) {
      setRAddError('All fields are required')
      return
    }
    const newItem: RItem = {
      category: rAddForm.category.trim(),
      suggestion: rAddForm.suggestion.trim(),
      reason: rAddForm.reason.trim(),
    }
    const updated = [...recs, newItem]
    startRSave(async () => {
      const result = await updatePlanAction(eventId, { recommendations: updated })
      if (result.success) {
        setRecs(updated)
        setRAddOpen(false)
        setRAddForm({ category: '', suggestion: '', reason: '' })
        setRAddError(null)
        flash(setRSaved)
      } else {
        setRAddError(result.error)
      }
    })
  }

  function executeRDelete(idx: number) {
    const updated = recs.filter((_, i) => i !== idx)
    startRSave(async () => {
      const result = await updatePlanAction(eventId, { recommendations: updated })
      if (result.success) {
        setRecs(updated)
        flash(setRSaved)
      }
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Timeline delete dialog */}
      <AlertDialog
        open={tlDeleteIdx !== null}
        onOpenChange={(open) => !open && setTlDeleteIdx(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete timeline item?</AlertDialogTitle>
            <AlertDialogDescription>
              This item will be permanently removed from the timeline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const idx = tlDeleteIdx!
                setTlDeleteIdx(null)
                executeTlDelete(idx)
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vendor delete dialog */}
      <AlertDialog
        open={vDeleteIdx !== null}
        onOpenChange={(open) => !open && setVDeleteIdx(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vendor category?</AlertDialogTitle>
            <AlertDialogDescription>
              This vendor category will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const idx = vDeleteIdx!
                setVDeleteIdx(null)
                executeVDelete(idx)
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recommendation delete dialog */}
      <AlertDialog
        open={rDeleteIdx !== null}
        onOpenChange={(open) => !open && setRDeleteIdx(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recommendation?</AlertDialogTitle>
            <AlertDialogDescription>
              This recommendation will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const idx = rDeleteIdx!
                setRDeleteIdx(null)
                executeRDelete(idx)
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mt-8 space-y-10">
        {/* ── Event Concept ─────────────────────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Event Concept</h2>
            <div className="flex items-center gap-2">
              {conceptSaved && (
                <span className="text-xs text-emerald-600">Saved ✓</span>
              )}
              {!conceptEditing && (
                <button
                  onClick={() => {
                    setConceptEditing(true)
                    setConceptError(null)
                  }}
                  className="text-slate-400 hover:text-indigo-600"
                  title="Edit concept"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <Card className="border-indigo-200 bg-indigo-50">
            <CardContent className="p-6">
              {conceptEditing ? (
                <InlineTextarea
                  initialValue={conceptText}
                  error={conceptError}
                  disabled={conceptPending}
                  onCommit={saveConceptText}
                  onCancel={() => {
                    setConceptEditing(false)
                    setConceptError(null)
                  }}
                />
              ) : (
                <p
                  className="cursor-pointer text-slate-800 hover:text-indigo-700"
                  onClick={() => {
                    setConceptEditing(true)
                    setConceptError(null)
                  }}
                  title="Click to edit"
                >
                  {conceptText || 'No concept summary captured.'}
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── Timeline ──────────────────────────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Timeline</h2>
            {tlSaved && <span className="text-xs text-emerald-600">Saved ✓</span>}
          </div>
          <Card className="border-slate-200">
            <CardContent className="divide-y divide-slate-100 p-0">
              {timeline.length === 0 ? (
                <p className="p-6 text-sm text-slate-500">No timeline items yet.</p>
              ) : (
                timeline.map((item, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[80px_1fr_auto] gap-4 px-5 py-4 sm:grid-cols-[110px_1fr_auto]"
                  >
                    <div>
                      {tlEdit?.idx === i && tlEdit.field === 'time' ? (
                        <InlineInput
                          initialValue={item.time}
                          error={tlEdit.error}
                          disabled={tlPending}
                          onCommit={(v) => commitTlEdit(i, 'time', v)}
                          onCancel={() => setTlEdit(null)}
                        />
                      ) : (
                        <p
                          className="cursor-pointer font-mono text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                          onClick={() => setTlEdit({ idx: i, field: 'time', error: null })}
                          title="Click to edit time"
                        >
                          {item.time}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      {tlEdit?.idx === i && tlEdit.field === 'activity' ? (
                        <InlineInput
                          initialValue={item.activity}
                          error={tlEdit.error}
                          disabled={tlPending}
                          onCommit={(v) => commitTlEdit(i, 'activity', v)}
                          onCancel={() => setTlEdit(null)}
                        />
                      ) : (
                        <p
                          className="cursor-pointer text-sm font-medium text-slate-900 hover:text-indigo-600"
                          onClick={() => setTlEdit({ idx: i, field: 'activity', error: null })}
                          title="Click to edit activity"
                        >
                          {item.activity}
                        </p>
                      )}
                      {tlEdit?.idx === i && tlEdit.field === 'notes' ? (
                        <InlineInput
                          initialValue={item.notes ?? ''}
                          error={tlEdit.error}
                          disabled={tlPending}
                          placeholder="Notes (optional)"
                          onCommit={(v) => commitTlEdit(i, 'notes', v)}
                          onCancel={() => setTlEdit(null)}
                        />
                      ) : (
                        <p
                          className="cursor-pointer text-sm text-slate-500 hover:text-indigo-500"
                          onClick={() => setTlEdit({ idx: i, field: 'notes', error: null })}
                          title="Click to edit notes"
                        >
                          {item.notes ?? 'Add notes…'}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setTlDeleteIdx(i)}
                      className="shrink-0 self-start pt-1 text-slate-200 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {tlAddOpen ? (
            <div className="mt-3 space-y-3 rounded-lg border border-indigo-200 bg-indigo-50/40 p-4">
              <p className="text-sm font-semibold text-slate-800">Add timeline item</p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={tlAddForm.time}
                  onChange={(e) => setTlAddForm((f) => ({ ...f, time: e.target.value }))}
                  placeholder="Time *"
                  className="h-8 text-sm"
                  autoFocus
                />
                <Input
                  value={tlAddForm.activity}
                  onChange={(e) => setTlAddForm((f) => ({ ...f, activity: e.target.value }))}
                  placeholder="Activity *"
                  className="h-8 text-sm"
                />
              </div>
              <Input
                value={tlAddForm.notes}
                onChange={(e) => setTlAddForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Notes (optional)"
                className="h-8 text-sm"
              />
              {tlAddError && <p className="text-sm text-red-600">{tlAddError}</p>}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={submitTlAdd}
                  disabled={tlPending}
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {tlPending ? 'Saving…' : 'Add'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTlAddOpen(false)
                    setTlAddForm({ time: '', activity: '', notes: '' })
                    setTlAddError(null)
                  }}
                  disabled={tlPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setTlAddOpen(true)}
              className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600"
            >
              <Plus className="h-3.5 w-3.5" />
              Add timeline item
            </button>
          )}
        </section>

        {/* ── Vendor Categories ─────────────────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Vendor Categories</h2>
            {vSaved && <span className="text-xs text-emerald-600">Saved ✓</span>}
          </div>

          {vendors.length === 0 ? (
            <p className="text-sm text-slate-500">No vendor categories yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {vendors.map((v, i) => (
                <Card key={i} className="border-slate-200">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {vEdit?.idx === i && vEdit.field === 'name' ? (
                          <InlineInput
                            initialValue={v.name}
                            error={vEdit.error}
                            disabled={vPending}
                            onCommit={(val) => commitVEdit(i, 'name', val)}
                            onCancel={() => setVEdit(null)}
                          />
                        ) : (
                          <h3
                            className="cursor-pointer font-semibold text-slate-900 hover:text-indigo-600"
                            onClick={() => setVEdit({ idx: i, field: 'name', error: null })}
                            title="Click to edit name"
                          >
                            {v.name}
                          </h3>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Badge
                          variant={PRIORITY_VARIANTS[v.priority]}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => cycleVendorPriority(i)}
                          title="Click to cycle priority"
                        >
                          {v.priority}
                        </Badge>
                        <button
                          onClick={() => setVDeleteIdx(i)}
                          className="text-slate-200 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {vEdit?.idx === i && vEdit.field === 'description' ? (
                      <InlineInput
                        initialValue={v.description}
                        error={vEdit.error}
                        disabled={vPending}
                        onCommit={(val) => commitVEdit(i, 'description', val)}
                        onCancel={() => setVEdit(null)}
                      />
                    ) : (
                      <p
                        className="cursor-pointer text-sm text-slate-600 hover:text-indigo-500"
                        onClick={() => setVEdit({ idx: i, field: 'description', error: null })}
                        title="Click to edit description"
                      >
                        {v.description}
                      </p>
                    )}

                    {vEdit?.idx === i && vEdit.field === 'estimated_cost' ? (
                      <InlineInput
                        initialValue={v.estimated_cost}
                        error={vEdit.error}
                        disabled={vPending}
                        placeholder="Estimated cost"
                        onCommit={(val) => commitVEdit(i, 'estimated_cost', val)}
                        onCancel={() => setVEdit(null)}
                      />
                    ) : (
                      <p
                        className="cursor-pointer text-sm font-medium text-slate-900 hover:text-indigo-600"
                        onClick={() => setVEdit({ idx: i, field: 'estimated_cost', error: null })}
                        title="Click to edit estimated cost"
                      >
                        Estimated cost: {v.estimated_cost}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {vAddOpen ? (
            <div className="mt-4 space-y-3 rounded-lg border border-indigo-200 bg-indigo-50/40 p-4">
              <p className="text-sm font-semibold text-slate-800">Add vendor category</p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={vAddForm.name}
                  onChange={(e) => setVAddForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Name *"
                  className="h-8 text-sm"
                  autoFocus
                />
                <select
                  value={vAddForm.priority}
                  onChange={(e) =>
                    setVAddForm((f) => ({
                      ...f,
                      priority: e.target.value as VItem['priority'],
                    }))
                  }
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="essential">Essential</option>
                  <option value="recommended">Recommended</option>
                  <option value="optional">Optional</option>
                </select>
              </div>
              <Input
                value={vAddForm.description}
                onChange={(e) => setVAddForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description *"
                className="h-8 text-sm"
              />
              <Input
                value={vAddForm.estimated_cost}
                onChange={(e) => setVAddForm((f) => ({ ...f, estimated_cost: e.target.value }))}
                placeholder="Estimated cost (optional)"
                className="h-8 text-sm"
              />
              {vAddError && <p className="text-sm text-red-600">{vAddError}</p>}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={submitVAdd}
                  disabled={vPending}
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {vPending ? 'Saving…' : 'Add'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setVAddOpen(false)
                    setVAddForm({ name: '', description: '', estimated_cost: '', priority: 'recommended' })
                    setVAddError(null)
                  }}
                  disabled={vPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setVAddOpen(true)}
              className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600"
            >
              <Plus className="h-3.5 w-3.5" />
              Add vendor category
            </button>
          )}
        </section>

        {/* ── Recommendations ───────────────────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recommendations</h2>
            {rSaved && <span className="text-xs text-emerald-600">Saved ✓</span>}
          </div>

          {recs.length === 0 ? (
            <p className="text-sm text-slate-500">No recommendations yet.</p>
          ) : (
            <div className="space-y-3">
              {recs.map((r, i) => (
                <Card key={i} className="border-slate-200">
                  <CardContent className="space-y-2 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {rEdit?.idx === i && rEdit.field === 'category' ? (
                          <InlineInput
                            initialValue={r.category}
                            error={rEdit.error}
                            disabled={rPending}
                            onCommit={(v) => commitREdit(i, 'category', v)}
                            onCancel={() => setREdit(null)}
                          />
                        ) : (
                          <p
                            className="cursor-pointer text-xs font-medium uppercase tracking-wide text-indigo-600 hover:text-indigo-800"
                            onClick={() => setREdit({ idx: i, field: 'category', error: null })}
                            title="Click to edit category"
                          >
                            {r.category}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setRDeleteIdx(i)}
                        className="shrink-0 text-slate-200 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {rEdit?.idx === i && rEdit.field === 'suggestion' ? (
                      <InlineInput
                        initialValue={r.suggestion}
                        error={rEdit.error}
                        disabled={rPending}
                        onCommit={(v) => commitREdit(i, 'suggestion', v)}
                        onCancel={() => setREdit(null)}
                      />
                    ) : (
                      <p
                        className="cursor-pointer text-sm font-medium text-slate-900 hover:text-indigo-600"
                        onClick={() => setREdit({ idx: i, field: 'suggestion', error: null })}
                        title="Click to edit suggestion"
                      >
                        {r.suggestion}
                      </p>
                    )}

                    {rEdit?.idx === i && rEdit.field === 'reason' ? (
                      <InlineInput
                        initialValue={r.reason}
                        error={rEdit.error}
                        disabled={rPending}
                        onCommit={(v) => commitREdit(i, 'reason', v)}
                        onCancel={() => setREdit(null)}
                      />
                    ) : (
                      <p
                        className="cursor-pointer text-sm text-slate-600 hover:text-indigo-500"
                        onClick={() => setREdit({ idx: i, field: 'reason', error: null })}
                        title="Click to edit reason"
                      >
                        Why: {r.reason}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {rAddOpen ? (
            <div className="mt-4 space-y-3 rounded-lg border border-indigo-200 bg-indigo-50/40 p-4">
              <p className="text-sm font-semibold text-slate-800">Add recommendation</p>
              <Input
                value={rAddForm.category}
                onChange={(e) => setRAddForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Category *"
                className="h-8 text-sm"
                autoFocus
              />
              <Input
                value={rAddForm.suggestion}
                onChange={(e) => setRAddForm((f) => ({ ...f, suggestion: e.target.value }))}
                placeholder="Suggestion *"
                className="h-8 text-sm"
              />
              <Input
                value={rAddForm.reason}
                onChange={(e) => setRAddForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Why (reason) *"
                className="h-8 text-sm"
              />
              {rAddError && <p className="text-sm text-red-600">{rAddError}</p>}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={submitRAdd}
                  disabled={rPending}
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  {rPending ? 'Saving…' : 'Add'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setRAddOpen(false)
                    setRAddForm({ category: '', suggestion: '', reason: '' })
                    setRAddError(null)
                  }}
                  disabled={rPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setRAddOpen(true)}
              className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600"
            >
              <Plus className="h-3.5 w-3.5" />
              Add recommendation
            </button>
          )}
        </section>

        {/* ── Bottom action buttons ──────────────────────────────────────────── */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <BudgetGenerateButton eventId={eventId} />
          <GeneratePlanButton eventId={eventId} mode="regenerate" hasPlan={true} />
        </div>
      </div>
    </>
  )
}

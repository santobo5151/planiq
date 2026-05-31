'use client'

import {
  useState,
  useRef,
  useEffect,
  useTransition,
  type KeyboardEvent,
} from 'react'
import { Trash2, Plus, Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
  updateBudgetItemAction,
  addBudgetItemAction,
  deleteBudgetItemAction,
} from '@/app/events/[eventId]/actions'
import { getCurrencySymbol } from '@/lib/localisation'
import type { Event as PlanIQEvent, Budget, BudgetStatus } from '@/types/database'

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_CYCLE: Record<BudgetStatus, BudgetStatus> = {
  pending: 'confirmed',
  confirmed: 'paid',
  paid: 'pending',
}

const STATUS_VARIANTS: Record<BudgetStatus, 'secondary' | 'warning' | 'success'> = {
  pending: 'secondary',
  confirmed: 'warning',
  paid: 'success',
}

type EditableField =
  | 'category'
  | 'description'
  | 'estimated_amount'
  | 'actual_amount'
  | 'notes'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmount(amount: number | null, symbol: string): string {
  if (amount == null) return '—'
  return `${symbol}${amount.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
}

function fmtVariance(
  estimated: number | null,
  actual: number | null,
  symbol: string
): { text: string; cls: string } {
  const est = estimated ?? 0
  const act = actual ?? 0
  const v = est - act
  if (v > 0)
    return {
      text: `+${symbol}${v.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`,
      cls: 'text-emerald-600',
    }
  if (v < 0)
    return {
      text: `-${symbol}${Math.abs(v).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`,
      cls: 'text-red-600',
    }
  return { text: `${symbol}0`, cls: 'text-slate-400' }
}

// Parse a numeric string. Does NOT strip the minus sign — parseFloat sees it.
function parseAmount(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = parseFloat(trimmed)
  return Number.isFinite(n) && n >= 0 ? n : null
}

// ── CellInput ────────────────────────────────────────────────────────────────
// Isolated component: owns its own value state so typing never triggers
// a parent re-render. Only calls onCommit/onCancel on deliberate action.

interface CellInputProps {
  initialValue: string
  inputType?: string
  error: string | null
  disabled?: boolean
  onCommit: (value: string) => void
  onCancel: () => void
}

function CellInput({
  initialValue,
  inputType = 'text',
  error,
  disabled,
  onCommit,
  onCancel,
}: CellInputProps) {
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
          type={inputType}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 w-full min-w-[72px] px-2 py-0 text-sm"
          disabled={disabled}
        />
        <button
          onClick={() => onCommit(value)}
          disabled={disabled}
          className="shrink-0 text-emerald-600 hover:text-emerald-700 disabled:opacity-40"
          title="Save (Enter)"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          onClick={onCancel}
          disabled={disabled}
          className="shrink-0 text-slate-400 hover:text-slate-600"
          title="Cancel (Escape)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ── EditableCell ─────────────────────────────────────────────────────────────
// Switches between a clickable display cell and an editing cell (CellInput).
// Defined outside BudgetTable so React never remounts it on parent re-render.

interface EditableCellProps {
  initialValue: string
  displayValue: string
  isEditing: boolean
  inputType?: string
  error: string | null
  disabled?: boolean
  cellClassName?: string
  onActivate: () => void
  onCommit: (value: string) => void
  onCancel: () => void
}

function EditableCell({
  initialValue,
  displayValue,
  isEditing,
  inputType,
  error,
  disabled,
  cellClassName = '',
  onActivate,
  onCommit,
  onCancel,
}: EditableCellProps) {
  if (isEditing) {
    return (
      <TableCell className={`px-2 py-1 ${cellClassName}`}>
        <CellInput
          initialValue={initialValue}
          inputType={inputType}
          error={error}
          disabled={disabled}
          onCommit={onCommit}
          onCancel={onCancel}
        />
      </TableCell>
    )
  }

  return (
    <TableCell
      className={`cursor-pointer px-2 py-1 text-sm hover:bg-indigo-50 ${cellClassName}`}
      onClick={onActivate}
      title="Click to edit"
    >
      <span className="block max-w-[130px] truncate">{displayValue}</span>
    </TableCell>
  )
}

// ── BudgetTable ──────────────────────────────────────────────────────────────

interface Props {
  event: PlanIQEvent
  items: Budget[]
  onUpdate: (item: Budget) => void
  onAdd: (item: Budget) => void
  onDelete: (id: string) => void
}

type EditState = {
  itemId: string
  field: EditableField
  error: string | null
}

type AddForm = {
  category: string
  description: string
  estimated_amount: string
  notes: string
  error: string | null
}

const EMPTY_ADD: AddForm = {
  category: '',
  description: '',
  estimated_amount: '',
  notes: '',
  error: null,
}

export function BudgetTable({ event, items, onUpdate, onAdd, onDelete }: Props) {
  const symbol = getCurrencySymbol(event.location)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState<AddForm>(EMPTY_ADD)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [savePending, startSaveTransition] = useTransition()
  const [addPending, startAddTransition] = useTransition()

  // ── Inline editing ─────────────────────────────────────────────────────────

  function startEdit(itemId: string, field: EditableField) {
    setEdit({ itemId, field, error: null })
  }

  function cancelEdit() {
    setEdit(null)
  }

  function commitEdit(item: Budget, field: EditableField, value: string) {
    let updateData: Parameters<typeof updateBudgetItemAction>[1] = {}

    if (field === 'estimated_amount' || field === 'actual_amount') {
      const parsed = parseAmount(value)
      if (parsed === null) {
        setEdit((e) => e && { ...e, error: 'Enter a number ≥ 0' })
        return
      }
      updateData = { [field]: parsed }
    } else if (field === 'category') {
      if (!value.trim()) {
        setEdit((e) => e && { ...e, error: 'Category cannot be empty' })
        return
      }
      updateData = { category: value.trim() }
    } else {
      updateData = { [field]: value }
    }

    startSaveTransition(async () => {
      const result = await updateBudgetItemAction(item.id, updateData)
      if (result.success) {
        const updated: Budget = {
          ...item,
          ...(field === 'estimated_amount' || field === 'actual_amount'
            ? { [field]: parseAmount(value) }
            : {
                [field]:
                  field === 'category' ? value.trim() : value,
              }),
        }
        onUpdate(updated)
        setEdit(null)
      } else {
        setEdit((e) => e && { ...e, error: result.error })
      }
    })
  }

  function isActiveField(itemId: string, field: EditableField) {
    return edit?.itemId === itemId && edit.field === field
  }

  function editError(itemId: string, field: EditableField): string | null {
    return isActiveField(itemId, field) ? (edit?.error ?? null) : null
  }

  function initialFor(item: Budget, field: EditableField): string {
    const raw = item[field]
    return raw == null ? '' : String(raw)
  }

  // ── Status cycling (optimistic) ────────────────────────────────────────────

  function cycleStatus(item: Budget) {
    const next = STATUS_CYCLE[item.status]
    onUpdate({ ...item, status: next })
    startSaveTransition(async () => {
      const result = await updateBudgetItemAction(item.id, { status: next })
      if (!result.success) onUpdate(item) // rollback
    })
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  function executeDelete(id: string) {
    setPendingDelete(null)
    setDeletingId(id)
    startSaveTransition(async () => {
      const result = await deleteBudgetItemAction(id)
      setDeletingId(null)
      if (result.success) onDelete(id)
    })
  }

  // ── Add form ───────────────────────────────────────────────────────────────

  function submitAdd() {
    if (!addForm.category.trim()) {
      setAddForm((f) => ({ ...f, error: 'Category is required' }))
      return
    }
    if (!addForm.description.trim()) {
      setAddForm((f) => ({ ...f, error: 'Description is required' }))
      return
    }
    const amount = parseAmount(addForm.estimated_amount)
    if (amount === null) {
      setAddForm((f) => ({ ...f, error: 'Enter a valid amount ≥ 0' }))
      return
    }

    startAddTransition(async () => {
      const result = await addBudgetItemAction(event.id, {
        category: addForm.category.trim(),
        description: addForm.description.trim(),
        estimated_amount: amount,
        notes: addForm.notes.trim() || undefined,
      })
      if (result.success) {
        onAdd({
          id: result.budgetItemId,
          event_id: event.id,
          category: addForm.category.trim(),
          description: addForm.description.trim(),
          estimated_amount: amount,
          actual_amount: 0,
          notes: addForm.notes.trim() || null,
          status: 'pending',
          ai_generated: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        setAddForm(EMPTY_ADD)
        setShowAdd(false)
      } else {
        setAddForm((f) => ({ ...f, error: result.error }))
      }
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="px-2 py-2 text-xs font-semibold text-slate-700">
                Category
              </TableHead>
              <TableHead className="px-2 py-2 text-xs font-semibold text-slate-700">
                Description
              </TableHead>
              <TableHead className="px-2 py-2 text-right text-xs font-semibold text-slate-700">
                Estimated
              </TableHead>
              <TableHead className="px-2 py-2 text-right text-xs font-semibold text-slate-700">
                Actual
              </TableHead>
              <TableHead className="px-2 py-2 text-right text-xs font-semibold text-slate-700">
                Variance
              </TableHead>
              <TableHead className="px-2 py-2 text-xs font-semibold text-slate-700">
                Notes
              </TableHead>
              <TableHead className="px-2 py-2 text-xs font-semibold text-slate-700">
                Status
              </TableHead>
              <TableHead className="w-8 px-2 py-2" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const variance = fmtVariance(
                item.estimated_amount,
                item.actual_amount,
                symbol
              )
              return (
                <TableRow
                  key={item.id}
                  className={
                    deletingId === item.id
                      ? 'opacity-40'
                      : item.ai_generated
                        ? ''
                        : 'bg-amber-50/40'
                  }
                >
                  <EditableCell
                    initialValue={initialFor(item, 'category')}
                    displayValue={item.category}
                    isEditing={isActiveField(item.id, 'category')}
                    error={editError(item.id, 'category')}
                    disabled={savePending}
                    cellClassName="font-medium text-slate-900"
                    onActivate={() => startEdit(item.id, 'category')}
                    onCommit={(v) => commitEdit(item, 'category', v)}
                    onCancel={cancelEdit}
                  />
                  <EditableCell
                    initialValue={initialFor(item, 'description')}
                    displayValue={item.description ?? '—'}
                    isEditing={isActiveField(item.id, 'description')}
                    error={editError(item.id, 'description')}
                    disabled={savePending}
                    cellClassName="text-slate-600"
                    onActivate={() => startEdit(item.id, 'description')}
                    onCommit={(v) => commitEdit(item, 'description', v)}
                    onCancel={cancelEdit}
                  />
                  <EditableCell
                    initialValue={initialFor(item, 'estimated_amount')}
                    displayValue={fmtAmount(item.estimated_amount, symbol)}
                    isEditing={isActiveField(item.id, 'estimated_amount')}
                    inputType="number"
                    error={editError(item.id, 'estimated_amount')}
                    disabled={savePending}
                    cellClassName="text-right tabular-nums text-slate-900"
                    onActivate={() => startEdit(item.id, 'estimated_amount')}
                    onCommit={(v) => commitEdit(item, 'estimated_amount', v)}
                    onCancel={cancelEdit}
                  />
                  <EditableCell
                    initialValue={initialFor(item, 'actual_amount')}
                    displayValue={fmtAmount(item.actual_amount, symbol)}
                    isEditing={isActiveField(item.id, 'actual_amount')}
                    inputType="number"
                    error={editError(item.id, 'actual_amount')}
                    disabled={savePending}
                    cellClassName="text-right tabular-nums text-slate-600"
                    onActivate={() => startEdit(item.id, 'actual_amount')}
                    onCommit={(v) => commitEdit(item, 'actual_amount', v)}
                    onCancel={cancelEdit}
                  />
                  {/* Variance — read-only */}
                  <TableCell
                    className={`px-2 py-1 text-right text-sm tabular-nums font-medium ${variance.cls}`}
                  >
                    {variance.text}
                  </TableCell>
                  <EditableCell
                    initialValue={initialFor(item, 'notes')}
                    displayValue={item.notes ?? '—'}
                    isEditing={isActiveField(item.id, 'notes')}
                    error={editError(item.id, 'notes')}
                    disabled={savePending}
                    cellClassName="text-slate-600"
                    onActivate={() => startEdit(item.id, 'notes')}
                    onCommit={(v) => commitEdit(item, 'notes', v)}
                    onCancel={cancelEdit}
                  />
                  <TableCell className="px-2 py-1">
                    {pendingDelete === item.id ? (
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <span className="text-xs text-slate-600">Delete?</span>
                        <button
                          onClick={() => executeDelete(item.id)}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setPendingDelete(null)}
                          className="text-xs text-slate-500 hover:underline"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <Badge
                        variant={STATUS_VARIANTS[item.status]}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => cycleStatus(item)}
                        title="Click to cycle status"
                      >
                        {item.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-2 py-1">
                    <button
                      onClick={() => setPendingDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="text-slate-300 hover:text-red-500 disabled:opacity-30"
                      title="Delete row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {showAdd ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-800">
            Add line item
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Category *
              </label>
              <Input
                value={addForm.category}
                onChange={(e) =>
                  setAddForm((f) => ({
                    ...f,
                    category: e.target.value,
                    error: null,
                  }))
                }
                placeholder="e.g. Catering"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Description *
              </label>
              <Input
                value={addForm.description}
                onChange={(e) =>
                  setAddForm((f) => ({
                    ...f,
                    description: e.target.value,
                    error: null,
                  }))
                }
                placeholder="Brief description"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Estimated ({symbol}) *
              </label>
              <Input
                type="number"
                min="0"
                value={addForm.estimated_amount}
                onChange={(e) =>
                  setAddForm((f) => ({
                    ...f,
                    estimated_amount: e.target.value,
                    error: null,
                  }))
                }
                placeholder="0"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Notes
              </label>
              <Input
                value={addForm.notes}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Optional"
                className="h-8 text-sm"
              />
            </div>
          </div>
          {addForm.error && (
            <p className="mt-2 text-sm text-red-600">{addForm.error}</p>
          )}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={submitAdd}
              disabled={addPending}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {addPending ? 'Adding…' : 'Add'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowAdd(false)
                setAddForm(EMPTY_ADD)
              }}
              disabled={addPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAdd(true)}
          className="gap-1 text-slate-600"
        >
          <Plus className="h-4 w-4" />
          Add line item
        </Button>
      )}
    </div>
  )
}

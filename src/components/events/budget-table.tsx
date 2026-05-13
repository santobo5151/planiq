'use client'

import { useState, useRef, useTransition, type KeyboardEvent } from 'react'
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

const STATUS_CYCLE: Record<BudgetStatus, BudgetStatus> = {
  pending: 'confirmed',
  confirmed: 'paid',
  paid: 'pending',
}

const STATUS_STYLES: Record<BudgetStatus, string> = {
  pending: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent cursor-pointer',
  confirmed: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-transparent cursor-pointer',
  paid: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-transparent cursor-pointer',
}

interface Props {
  event: PlanIQEvent
  items: Budget[]
  onUpdate: (item: Budget) => void
  onAdd: (item: Budget) => void
  onDelete: (id: string) => void
}

type EditState = {
  itemId: string
  field: keyof Budget
  value: string
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

function fmtAmount(amount: number | null, symbol: string): string {
  if (amount == null) return '—'
  return `${symbol}${amount.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
}

function parseAmount(raw: string): number | null {
  const n = parseFloat(raw.replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : null
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
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Inline cell editing ─────────────────────────────────────────────────

  function startEdit(item: Budget, field: keyof Budget) {
    const raw = item[field]
    const value =
      field === 'estimated_amount' || field === 'actual_amount'
        ? raw == null ? '' : String(raw)
        : raw == null ? '' : String(raw)
    setEdit({ itemId: item.id, field, value, error: null })
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function cancelEdit() {
    setEdit(null)
  }

  function commitEdit(item: Budget) {
    if (!edit || edit.itemId !== item.id) return

    const field = edit.field as
      | 'category'
      | 'description'
      | 'estimated_amount'
      | 'actual_amount'
      | 'notes'

    let updateData: Parameters<typeof updateBudgetItemAction>[1] = {}

    if (field === 'estimated_amount' || field === 'actual_amount') {
      const parsed = parseAmount(edit.value)
      if (parsed === null) {
        setEdit((e) => e && { ...e, error: 'Enter a number ≥ 0' })
        return
      }
      updateData = { [field]: parsed }
    } else if (field === 'category') {
      if (!edit.value.trim()) {
        setEdit((e) => e && { ...e, error: 'Category cannot be empty' })
        return
      }
      updateData = { category: edit.value.trim() }
    } else {
      updateData = { [field]: edit.value }
    }

    startSaveTransition(async () => {
      const result = await updateBudgetItemAction(item.id, updateData)
      if (result.success) {
        const updated: Budget = {
          ...item,
          ...(field === 'estimated_amount' || field === 'actual_amount'
            ? { [field]: parseAmount(edit.value) }
            : { [field]: field === 'category' ? edit.value.trim() : edit.value }),
        }
        onUpdate(updated)
        setEdit(null)
      } else {
        setEdit((e) => e && { ...e, error: result.error })
      }
    })
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>, item: Budget) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit(item)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  // ── Status cycling (optimistic) ─────────────────────────────────────────

  function cycleStatus(item: Budget) {
    const next = STATUS_CYCLE[item.status]
    const optimistic: Budget = { ...item, status: next }
    onUpdate(optimistic)
    startSaveTransition(async () => {
      const result = await updateBudgetItemAction(item.id, { status: next })
      if (!result.success) {
        onUpdate(item) // rollback
      }
    })
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  function confirmDelete(id: string) {
    setPendingDelete(id)
  }

  function cancelDelete() {
    setPendingDelete(null)
  }

  function executeDelete(id: string) {
    setPendingDelete(null)
    setDeletingId(id)
    startSaveTransition(async () => {
      const result = await deleteBudgetItemAction(id)
      setDeletingId(null)
      if (result.success) {
        onDelete(id)
      }
    })
  }

  // ── Add form ─────────────────────────────────────────────────────────────

  function submitAdd() {
    const amount = parseAmount(addForm.estimated_amount)
    if (!addForm.category.trim()) {
      setAddForm((f) => ({ ...f, error: 'Category is required' }))
      return
    }
    if (!addForm.description.trim()) {
      setAddForm((f) => ({ ...f, error: 'Description is required' }))
      return
    }
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
        const newItem: Budget = {
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
        }
        onAdd(newItem)
        setAddForm(EMPTY_ADD)
        setShowAdd(false)
      } else {
        setAddForm((f) => ({ ...f, error: result.error }))
      }
    })
  }

  // ── Cell renderer ────────────────────────────────────────────────────────

  function EditableCell({
    item,
    field,
    display,
    className = '',
    inputType = 'text',
  }: {
    item: Budget
    field: keyof Budget
    display: string
    className?: string
    inputType?: string
  }) {
    const isEditing = edit?.itemId === item.id && edit.field === field

    if (isEditing) {
      return (
        <TableCell className={`px-2 py-1 ${className}`}>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <Input
                ref={inputRef}
                type={inputType}
                value={edit.value}
                onChange={(e) =>
                  setEdit((s) => s && { ...s, value: e.target.value, error: null })
                }
                onKeyDown={(e) => onKeyDown(e, item)}
                className="h-7 w-full min-w-[80px] px-2 py-0 text-sm"
                disabled={savePending}
              />
              <button
                onClick={() => commitEdit(item)}
                disabled={savePending}
                className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
                title="Save (Enter)"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={cancelEdit}
                disabled={savePending}
                className="text-slate-400 hover:text-slate-600"
                title="Cancel (Escape)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {edit.error && (
              <p className="text-xs text-red-600">{edit.error}</p>
            )}
          </div>
        </TableCell>
      )
    }

    return (
      <TableCell
        className={`cursor-pointer px-2 py-1 text-sm hover:bg-indigo-50 ${className}`}
        onClick={() => startEdit(item, field)}
        title="Click to edit"
      >
        <span className="block max-w-[160px] truncate">{display}</span>
      </TableCell>
    )
  }

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
            {items.map((item) => (
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
                  item={item}
                  field="category"
                  display={item.category}
                  className="font-medium text-slate-900"
                />
                <EditableCell
                  item={item}
                  field="description"
                  display={item.description ?? '—'}
                  className="text-slate-600"
                />
                <EditableCell
                  item={item}
                  field="estimated_amount"
                  display={fmtAmount(item.estimated_amount, symbol)}
                  className="text-right tabular-nums text-slate-900"
                  inputType="number"
                />
                <EditableCell
                  item={item}
                  field="actual_amount"
                  display={fmtAmount(item.actual_amount, symbol)}
                  className="text-right tabular-nums text-slate-600"
                  inputType="number"
                />
                <EditableCell
                  item={item}
                  field="notes"
                  display={item.notes ?? '—'}
                  className="text-slate-600"
                />
                <TableCell className="px-2 py-1">
                  {pendingDelete === item.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-600">Delete?</span>
                      <button
                        onClick={() => executeDelete(item.id)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Yes
                      </button>
                      <button
                        onClick={cancelDelete}
                        className="text-xs text-slate-500 hover:underline"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <Badge
                      className={STATUS_STYLES[item.status]}
                      onClick={() => cycleStatus(item)}
                      title="Click to cycle status"
                    >
                      {item.status}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="px-2 py-1">
                  <button
                    onClick={() => confirmDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="text-slate-300 hover:text-red-500 disabled:opacity-30"
                    title="Delete row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
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
                  setAddForm((f) => ({ ...f, category: e.target.value, error: null }))
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

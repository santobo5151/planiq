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
import { Progress } from '@/components/ui/progress'
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
  updateChecklistItemAction,
  addChecklistItemAction,
  deleteChecklistItemAction,
} from '@/app/events/[eventId]/actions'
import type { Checklist, ChecklistStatus } from '@/types/database'
import type { ProgressData } from '@/components/events/checklist-manager'

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_CYCLE: Record<ChecklistStatus, ChecklistStatus> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
}

const STATUS_STYLES: Record<ChecklistStatus, string> = {
  todo: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-transparent cursor-pointer',
  in_progress:
    'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-transparent cursor-pointer',
  done: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-transparent cursor-pointer',
}

const NEW_CAT = '__new__'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDueDate(date: string | null): string {
  if (!date) return 'No date set'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ── CellInput ────────────────────────────────────────────────────────────────
// Isolated component — owns its own value state so typing never re-renders
// the parent. Only calls onCommit when user deliberately saves (Enter / ✓).

interface CellInputProps {
  initialValue: string
  inputType?: string
  error: string | null
  disabled?: boolean
  placeholder?: string
  onCommit: (value: string) => void
  onCancel: () => void
}

function CellInput({
  initialValue,
  inputType = 'text',
  error,
  disabled,
  placeholder,
  onCommit,
  onCancel,
}: CellInputProps) {
  const [value, setValue] = useState(initialValue)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.focus()
    if (inputType !== 'date') ref.current?.select()
  }, [inputType])

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

// ── Types ────────────────────────────────────────────────────────────────────

type EditableField = 'title' | 'category' | 'due_date' | 'notes'

type EditState = {
  itemId: string
  field: EditableField
  error: string | null
}

type CatAddForm = {
  category: string
  title: string
  due_date: string
  notes: string
  error: string | null
}

type GlobalForm = {
  selectedCategory: string
  newCategory: string
  title: string
  due_date: string
  notes: string
  error: string | null
}

const EMPTY_GLOBAL: GlobalForm = {
  selectedCategory: '',
  newCategory: '',
  title: '',
  due_date: '',
  notes: '',
  error: null,
}

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  items: Checklist[]
  progress: ProgressData
  eventId: string
  onUpdate: (item: Checklist) => void
  onAdd: (item: Checklist) => void
  onDelete: (id: string) => void
}

// ── ChecklistTaskList ────────────────────────────────────────────────────────

export function ChecklistTaskList({
  items,
  progress,
  eventId,
  onUpdate,
  onAdd,
  onDelete,
}: Props) {
  const [edit, setEdit] = useState<EditState | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [catAddForm, setCatAddForm] = useState<CatAddForm | null>(null)
  const [globalOpen, setGlobalOpen] = useState(false)
  const [globalForm, setGlobalForm] = useState<GlobalForm>(EMPTY_GLOBAL)

  const [savePending, startSave] = useTransition()
  const [addPending, startAdd] = useTransition()
  const [deletePending, startDelete] = useTransition()

  // Derive grouped and category list from items
  const grouped = items.reduce<Record<string, Checklist[]>>((acc, item) => {
    const key = item.category ?? 'General'
    ;(acc[key] ??= []).push(item)
    return acc
  }, {})
  const categories = Object.keys(grouped)

  // ── Status cycling (optimistic) ───────────────────────────────────────────

  function cycleStatus(item: Checklist) {
    const next = STATUS_CYCLE[item.status]
    onUpdate({ ...item, status: next })
    startSave(async () => {
      const result = await updateChecklistItemAction(item.id, { status: next })
      if (!result.success) onUpdate(item) // revert
    })
  }

  // ── Inline edit ───────────────────────────────────────────────────────────

  function startEdit(itemId: string, field: EditableField) {
    setEdit({ itemId, field, error: null })
  }

  function cancelEdit() {
    setEdit(null)
  }

  function commitEdit(item: Checklist, field: EditableField, value: string) {
    if (field === 'title' && !value.trim()) {
      setEdit((e) => e && { ...e, error: 'Title cannot be empty' })
      return
    }
    if (field === 'category' && !value.trim()) {
      setEdit((e) => e && { ...e, error: 'Category cannot be empty' })
      return
    }
    if (field === 'due_date' && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setEdit((e) => e && { ...e, error: 'Use YYYY-MM-DD format' })
      return
    }

    const updateData: Parameters<typeof updateChecklistItemAction>[1] = {}
    if (field === 'title') updateData.title = value.trim()
    else if (field === 'category') updateData.category = value.trim()
    else if (field === 'due_date') updateData.due_date = value || null
    else if (field === 'notes') updateData.notes = value

    startSave(async () => {
      const result = await updateChecklistItemAction(item.id, updateData)
      if (result.success) {
        const updated: Checklist = {
          ...item,
          ...(field === 'title'
            ? { title: value.trim() }
            : field === 'category'
              ? { category: value.trim() }
              : field === 'due_date'
                ? { due_date: value || null }
                : { notes: value }),
        }
        onUpdate(updated)
        setEdit(null)
      } else {
        setEdit((e) => e && { ...e, error: result.error })
      }
    })
  }

  function isEditing(itemId: string, field: EditableField) {
    return edit?.itemId === itemId && edit.field === field
  }

  function editError(itemId: string, field: EditableField): string | null {
    return isEditing(itemId, field) ? (edit?.error ?? null) : null
  }

  function initialFor(item: Checklist, field: EditableField): string {
    if (field === 'due_date') return item.due_date ?? ''
    const v = item[field as keyof Checklist]
    return v == null ? '' : String(v)
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  function executeDelete(id: string) {
    startDelete(async () => {
      const result = await deleteChecklistItemAction(id)
      if (result.success) onDelete(id)
    })
  }

  // ── Per-category add form ─────────────────────────────────────────────────

  function openCatAdd(category: string) {
    setGlobalOpen(false)
    setCatAddForm({ category, title: '', due_date: '', notes: '', error: null })
  }

  function submitCatAdd() {
    if (!catAddForm) return
    if (!catAddForm.title.trim()) {
      setCatAddForm((f) => f && { ...f, error: 'Title is required' })
      return
    }
    startAdd(async () => {
      const result = await addChecklistItemAction(eventId, {
        title: catAddForm.title.trim(),
        category: catAddForm.category,
        due_date: catAddForm.due_date || null,
        notes: catAddForm.notes.trim() || undefined,
      })
      if (result.success) {
        onAdd({
          id: result.checklistItemId,
          event_id: eventId,
          title: catAddForm.title.trim(),
          category: catAddForm.category,
          due_date: catAddForm.due_date || null,
          notes: catAddForm.notes.trim() || null,
          status: 'todo',
          ai_generated: false,
          created_at: new Date().toISOString(),
        })
        setCatAddForm(null)
      } else {
        setCatAddForm((f) => f && { ...f, error: result.error })
      }
    })
  }

  // ── Global add form ───────────────────────────────────────────────────────

  function openGlobal() {
    setCatAddForm(null)
    setGlobalOpen(true)
    setGlobalForm(EMPTY_GLOBAL)
  }

  function submitGlobal() {
    const effectiveCat =
      globalForm.selectedCategory === NEW_CAT
        ? globalForm.newCategory.trim()
        : globalForm.selectedCategory

    if (!globalForm.title.trim()) {
      setGlobalForm((f) => ({ ...f, error: 'Title is required' }))
      return
    }
    if (!effectiveCat) {
      setGlobalForm((f) => ({ ...f, error: 'Category is required' }))
      return
    }

    startAdd(async () => {
      const result = await addChecklistItemAction(eventId, {
        title: globalForm.title.trim(),
        category: effectiveCat,
        due_date: globalForm.due_date || null,
        notes: globalForm.notes.trim() || undefined,
      })
      if (result.success) {
        onAdd({
          id: result.checklistItemId,
          event_id: eventId,
          title: globalForm.title.trim(),
          category: effectiveCat,
          due_date: globalForm.due_date || null,
          notes: globalForm.notes.trim() || null,
          status: 'todo',
          ai_generated: false,
          created_at: new Date().toISOString(),
        })
        setGlobalOpen(false)
        setGlobalForm(EMPTY_GLOBAL)
      } else {
        setGlobalForm((f) => ({ ...f, error: result.error }))
      }
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const { total, done, pct } = progress

  return (
    <>
      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This task will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const id = deleteConfirmId!
                setDeleteConfirmId(null)
                executeDelete(id)
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">
              {pct === 0
                ? 'Getting started — click a task status to mark progress'
                : `${done} of ${total} tasks complete (${pct}%)`}
            </span>
            {pct > 0 && (
              <span className="text-slate-500">{pct}%</span>
            )}
          </div>
          <Progress value={pct} className="h-3" />
        </div>

        {/* Global add button + form */}
        <div className="flex justify-end">
          {globalOpen ? (
            <div className="w-full rounded-lg border border-indigo-200 bg-indigo-50/40 p-4">
              <p className="mb-3 text-sm font-semibold text-slate-800">
                Add task
              </p>
              <div className="space-y-3">
                <Input
                  value={globalForm.title}
                  onChange={(e) =>
                    setGlobalForm((f) => ({
                      ...f,
                      title: e.target.value,
                      error: null,
                    }))
                  }
                  placeholder="Title *"
                  className="h-8 text-sm"
                />
                <div className="flex gap-2">
                  <select
                    value={globalForm.selectedCategory}
                    onChange={(e) =>
                      setGlobalForm((f) => ({
                        ...f,
                        selectedCategory: e.target.value,
                        newCategory: '',
                        error: null,
                      }))
                    }
                    className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="">Select category *</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value={NEW_CAT}>Other / New category…</option>
                  </select>
                  {globalForm.selectedCategory === NEW_CAT && (
                    <Input
                      value={globalForm.newCategory}
                      onChange={(e) =>
                        setGlobalForm((f) => ({
                          ...f,
                          newCategory: e.target.value,
                          error: null,
                        }))
                      }
                      placeholder="New category name *"
                      className="h-8 flex-1 text-sm"
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      Due date (optional)
                    </label>
                    <Input
                      type="date"
                      value={globalForm.due_date}
                      onChange={(e) =>
                        setGlobalForm((f) => ({
                          ...f,
                          due_date: e.target.value,
                        }))
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">
                      Notes (optional)
                    </label>
                    <Input
                      value={globalForm.notes}
                      onChange={(e) =>
                        setGlobalForm((f) => ({
                          ...f,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Optional"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                {globalForm.error && (
                  <p className="text-sm text-red-600">{globalForm.error}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={submitGlobal}
                    disabled={addPending}
                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    {addPending ? 'Adding…' : 'Add'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setGlobalOpen(false)
                      setGlobalForm(EMPTY_GLOBAL)
                    }}
                    disabled={addPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={openGlobal}
              className="gap-1 text-slate-600"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          )}
        </div>

        {/* Category sections */}
        {Object.entries(grouped).map(([category, tasks]) => {
          const catProgress = progress.byCategory[category] ?? {
            total: tasks.length,
            done: tasks.filter((t) => t.status === 'done').length,
          }

          return (
            <section key={category}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
                  {category}
                </h3>
                <span className="text-xs text-slate-400">
                  {catProgress.done}/{catProgress.total} done
                </span>
              </div>

              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`rounded-lg border bg-white px-4 py-3 transition-opacity ${
                      deletePending ? 'opacity-70' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status badge */}
                      <Badge
                        className={`mt-0.5 shrink-0 ${STATUS_STYLES[task.status]}`}
                        onClick={() => cycleStatus(task)}
                        title="Click to cycle status"
                      >
                        {task.status.replace('_', ' ')}
                      </Badge>

                      {/* Content */}
                      <div className="min-w-0 flex-1 space-y-1">
                        {/* Title */}
                        {isEditing(task.id, 'title') ? (
                          <CellInput
                            initialValue={initialFor(task, 'title')}
                            error={editError(task.id, 'title')}
                            disabled={savePending}
                            onCommit={(v) => commitEdit(task, 'title', v)}
                            onCancel={cancelEdit}
                          />
                        ) : (
                          <p
                            onClick={() => startEdit(task.id, 'title')}
                            className={`cursor-pointer text-sm font-medium hover:text-indigo-600 ${
                              task.status === 'done'
                                ? 'text-slate-400 line-through'
                                : 'text-slate-900'
                            }`}
                            title="Click to edit title"
                          >
                            {task.title}
                          </p>
                        )}

                        {/* Due date + Category row */}
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {/* Due date */}
                          {isEditing(task.id, 'due_date') ? (
                            <CellInput
                              initialValue={initialFor(task, 'due_date')}
                              inputType="date"
                              error={editError(task.id, 'due_date')}
                              disabled={savePending}
                              onCommit={(v) => commitEdit(task, 'due_date', v)}
                              onCancel={cancelEdit}
                            />
                          ) : (
                            <span
                              onClick={() => startEdit(task.id, 'due_date')}
                              className="cursor-pointer text-xs text-slate-400 hover:text-indigo-500"
                              title="Click to edit due date"
                            >
                              {formatDueDate(task.due_date)}
                            </span>
                          )}

                          {/* Category */}
                          {isEditing(task.id, 'category') ? (
                            <CellInput
                              initialValue={initialFor(task, 'category')}
                              error={editError(task.id, 'category')}
                              disabled={savePending}
                              placeholder="Category"
                              onCommit={(v) => commitEdit(task, 'category', v)}
                              onCancel={cancelEdit}
                            />
                          ) : (
                            <span
                              onClick={() => startEdit(task.id, 'category')}
                              className="cursor-pointer text-xs text-slate-400 hover:text-indigo-500"
                              title="Click to edit category"
                            >
                              {task.category ?? 'General'}
                            </span>
                          )}
                        </div>

                        {/* Notes */}
                        {isEditing(task.id, 'notes') ? (
                          <CellInput
                            initialValue={initialFor(task, 'notes')}
                            error={editError(task.id, 'notes')}
                            disabled={savePending}
                            placeholder="Add notes…"
                            onCommit={(v) => commitEdit(task, 'notes', v)}
                            onCancel={cancelEdit}
                          />
                        ) : (
                          <p
                            onClick={() => startEdit(task.id, 'notes')}
                            className="cursor-pointer text-xs text-slate-400 hover:text-indigo-500"
                            title="Click to edit notes"
                          >
                            {task.notes ?? 'Add notes…'}
                          </p>
                        )}
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteConfirmId(task.id)}
                        className="shrink-0 text-slate-200 hover:text-red-500"
                        title="Delete task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Per-category add form */}
              {catAddForm?.category === category ? (
                <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50/40 p-3">
                  <div className="space-y-2">
                    <Input
                      value={catAddForm.title}
                      onChange={(e) =>
                        setCatAddForm((f) =>
                          f && { ...f, title: e.target.value, error: null }
                        )
                      }
                      placeholder="Task title *"
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={catAddForm.due_date}
                        onChange={(e) =>
                          setCatAddForm((f) =>
                            f && { ...f, due_date: e.target.value }
                          )
                        }
                        className="h-8 text-sm"
                      />
                      <Input
                        value={catAddForm.notes}
                        onChange={(e) =>
                          setCatAddForm((f) =>
                            f && { ...f, notes: e.target.value }
                          )
                        }
                        placeholder="Notes (optional)"
                        className="h-8 text-sm"
                      />
                    </div>
                    {catAddForm.error && (
                      <p className="text-sm text-red-600">{catAddForm.error}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={submitCatAdd}
                        disabled={addPending}
                        className="bg-indigo-600 text-white hover:bg-indigo-700"
                      >
                        {addPending ? 'Adding…' : 'Add'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCatAddForm(null)}
                        disabled={addPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => openCatAdd(category)}
                  className="mt-2 flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add task
                </button>
              )}
            </section>
          )
        })}

        {items.length === 0 && (
          <p className="text-center text-sm text-slate-500">
            No tasks yet. Use the buttons above to add one.
          </p>
        )}
      </div>
    </>
  )
}

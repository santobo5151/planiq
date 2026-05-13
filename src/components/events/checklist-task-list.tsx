'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { Checklist, ChecklistStatus } from '@/types/database'

const STATUS_STYLES: Record<ChecklistStatus, string> = {
  todo: 'bg-slate-100 text-slate-700 hover:bg-slate-100 border-transparent',
  in_progress:
    'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-transparent',
  done: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-transparent',
}

interface Props {
  items: Checklist[]
}

function formatDueDate(date: string | null): string {
  if (!date) return 'No date set'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function ChecklistTaskList({ items }: Props) {
  const doneCount = items.filter((i) => i.status === 'done').length
  const pct = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0

  const grouped = items.reduce<Record<string, Checklist[]>>((acc, item) => {
    const key = item.category ?? 'General'
    ;(acc[key] ??= []).push(item)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">
            {pct === 0
              ? 'Getting started — mark tasks as done to track progress'
              : `${pct}% complete`}
          </span>
          <span className="text-slate-500">
            {doneCount} / {items.length} tasks done
          </span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      {Object.entries(grouped).map(([category, tasks]) => (
        <section key={category}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-indigo-600">
            {category}
          </h3>
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${
                      task.status === 'done'
                        ? 'text-slate-400 line-through'
                        : 'text-slate-900'
                    }`}
                  >
                    {task.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatDueDate(task.due_date)}
                  </p>
                  {task.notes && (
                    <p className="mt-1 text-xs text-slate-500">{task.notes}</p>
                  )}
                </div>
                <Badge className={STATUS_STYLES[task.status]}>
                  {task.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

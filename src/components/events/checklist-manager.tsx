'use client'

import { useState } from 'react'
import { ChecklistTaskList } from '@/components/events/checklist-task-list'
import type { Event as PlanIQEvent, Checklist } from '@/types/database'

export type ProgressData = {
  total: number
  done: number
  pct: number
  byCategory: Record<string, { total: number; done: number }>
}

function calcProgress(items: Checklist[]): ProgressData {
  const total = items.length
  const done = items.filter((i) => i.status === 'done').length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const byCategory: Record<string, { total: number; done: number }> = {}
  for (const item of items) {
    const cat = item.category ?? 'General'
    if (!byCategory[cat]) byCategory[cat] = { total: 0, done: 0 }
    byCategory[cat].total++
    if (item.status === 'done') byCategory[cat].done++
  }
  return { total, done, pct, byCategory }
}

interface Props {
  event: PlanIQEvent
  initialChecklistItems: Checklist[]
}

export function ChecklistManager({ event, initialChecklistItems }: Props) {
  const [items, setItems] = useState<Checklist[]>(initialChecklistItems)

  function handleUpdate(updated: Checklist) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
  }

  function handleAdd(newItem: Checklist) {
    setItems((prev) => [...prev, newItem])
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <ChecklistTaskList
      items={items}
      progress={calcProgress(items)}
      eventId={event.id}
      onUpdate={handleUpdate}
      onAdd={handleAdd}
      onDelete={handleDelete}
    />
  )
}

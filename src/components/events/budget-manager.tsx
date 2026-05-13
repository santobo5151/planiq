'use client'

import { useState } from 'react'
import { BudgetSummary } from '@/components/events/budget-summary'
import { BudgetTable } from '@/components/events/budget-table'
import type { Event as PlanIQEvent, Budget } from '@/types/database'

interface Props {
  event: PlanIQEvent
  initialBudgetItems: Budget[]
}

export function BudgetManager({ event, initialBudgetItems }: Props) {
  const [items, setItems] = useState<Budget[]>(initialBudgetItems)

  function handleUpdate(updated: Budget) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
  }

  function handleAdd(newItem: Budget) {
    setItems((prev) => [...prev, newItem])
  }

  function handleDelete(budgetItemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== budgetItemId))
  }

  return (
    <div className="space-y-8">
      <BudgetSummary event={event} items={items} />
      <BudgetTable
        event={event}
        items={items}
        onUpdate={handleUpdate}
        onAdd={handleAdd}
        onDelete={handleDelete}
      />
    </div>
  )
}

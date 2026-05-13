'use client'

import { Card, CardContent } from '@/components/ui/card'
import { getCurrencySymbol } from '@/lib/localisation'
import type { Event as PlanIQEvent, Budget } from '@/types/database'

interface Props {
  event: PlanIQEvent
  items: Budget[]
}

function fmt(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
}

export function BudgetSummary({ event, items }: Props) {
  const symbol = getCurrencySymbol(event.location)

  const totalEstimated = items.reduce(
    (sum, item) => sum + (item.estimated_amount ?? 0),
    0
  )
  const totalActual = items.reduce(
    (sum, item) => sum + (item.actual_amount ?? 0),
    0
  )
  const ceiling = event.budget_ceiling ?? null
  const remaining = ceiling != null ? ceiling - totalEstimated : null

  const stats: Array<{ label: string; value: string; highlight?: boolean }> = [
    ...(ceiling != null
      ? [{ label: 'Budget ceiling', value: fmt(ceiling, symbol) }]
      : []),
    { label: 'Total estimated', value: fmt(totalEstimated, symbol) },
    { label: 'Total actual spend', value: fmt(totalActual, symbol) },
    ...(remaining != null
      ? [
          {
            label: 'Estimated remaining',
            value: fmt(remaining, symbol),
            highlight: remaining < 0,
          },
        ]
      : []),
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ label, value, highlight }) => (
        <Card key={label} className="border-slate-200">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${
                highlight ? 'text-red-600' : 'text-slate-900'
              }`}
            >
              {value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

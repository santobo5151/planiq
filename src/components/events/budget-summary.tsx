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
  const ceiling = event.budget_ceiling ?? null

  const totalEstimated = items.reduce(
    (sum, item) => sum + (item.estimated_amount ?? 0),
    0
  )
  const totalActual = items.reduce(
    (sum, item) => sum + (item.actual_amount ?? 0),
    0
  )
  const remaining = ceiling != null ? ceiling - totalEstimated : null
  const overBudget = remaining !== null && remaining < 0

  return (
    <>
      {overBudget && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Warning: total estimated cost exceeds the budget ceiling by{' '}
          {fmt(Math.abs(remaining!), symbol)}.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ceiling != null && (
          <Card className="border-slate-200">
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Budget ceiling
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {fmt(ceiling, symbol)}
              </p>
            </CardContent>
          </Card>
        )}
        <Card className="border-slate-200">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total estimated
            </p>
            <p
              className={`mt-1 text-2xl font-bold ${overBudget ? 'text-red-600' : 'text-slate-900'}`}
            >
              {fmt(totalEstimated, symbol)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total actual spend
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {fmt(totalActual, symbol)}
            </p>
          </CardContent>
        </Card>
        {remaining !== null && (
          <Card className={overBudget ? 'border-red-200' : 'border-slate-200'}>
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Estimated remaining
              </p>
              <p
                className={`mt-1 text-2xl font-bold ${overBudget ? 'text-red-600' : 'text-emerald-600'}`}
              >
                {fmt(remaining, symbol)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

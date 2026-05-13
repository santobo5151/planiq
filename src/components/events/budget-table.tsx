'use client'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getCurrencySymbol } from '@/lib/localisation'
import type { Event as PlanIQEvent, Budget, BudgetStatus } from '@/types/database'

const STATUS_STYLES: Record<BudgetStatus, string> = {
  pending: 'bg-slate-100 text-slate-700 hover:bg-slate-100 border-transparent',
  confirmed:
    'bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-transparent',
  paid: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-transparent',
}

interface Props {
  event: PlanIQEvent
  items: Budget[]
}

function fmtAmount(
  amount: number | null,
  symbol: string
): string {
  if (amount == null) return '—'
  return `${symbol}${amount.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
}

export function BudgetTable({ event, items }: Props) {
  const symbol = getCurrencySymbol(event.location)

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="font-semibold text-slate-700">Category</TableHead>
            <TableHead className="font-semibold text-slate-700">Description</TableHead>
            <TableHead className="text-right font-semibold text-slate-700">
              Estimated
            </TableHead>
            <TableHead className="text-right font-semibold text-slate-700">
              Actual
            </TableHead>
            <TableHead className="font-semibold text-slate-700">Notes</TableHead>
            <TableHead className="font-semibold text-slate-700">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className="hover:bg-slate-50">
              <TableCell className="font-medium text-slate-900">
                {item.category}
              </TableCell>
              <TableCell className="text-slate-600">
                {item.description ?? '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums text-slate-900">
                {fmtAmount(item.estimated_amount, symbol)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-slate-600">
                {fmtAmount(item.actual_amount, symbol)}
              </TableCell>
              <TableCell className="max-w-[200px] text-sm text-slate-600">
                {item.notes ?? '—'}
              </TableCell>
              <TableCell>
                <Badge className={STATUS_STYLES[item.status]}>
                  {item.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

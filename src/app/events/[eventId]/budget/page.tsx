import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getEventById, getBudget } from '@/services/events'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { BudgetGenerateButton } from '@/components/events/budget-generate-button'
import { BudgetSummary } from '@/components/events/budget-summary'
import { BudgetTable } from '@/components/events/budget-table'

export default async function BudgetPage({
  params,
}: {
  params: { eventId: string }
}) {
  const user = await requireAuth()
  const event = await getEventById(params.eventId, user.id)
  if (!event) redirect('/dashboard')

  const items = await getBudget(params.eventId)
  const hasBudget = items.length > 0

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-indigo-600">
          <Link href={`/events/${event.id}`} className="hover:underline">
            ← Back to Event
          </Link>
          <span className="text-slate-300">|</span>
          <Link href={`/events/${event.id}/checklist`} className="hover:underline">
            View Checklist →
          </Link>
        </div>

        <header className="mt-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Budget
          </h1>
          <p className="mt-1 text-slate-600">{event.title}</p>
        </header>

        {!hasBudget ? (
          <Card className="mt-8 border-dashed border-slate-300">
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <p className="text-base font-medium text-slate-900">
                No budget generated yet
              </p>
              <p className="max-w-md text-sm text-slate-600">
                PlanIQ will analyse your event details and plan to produce an
                itemised budget broken down by vendor category — including
                estimated costs calibrated to your location and scale.
              </p>
              <BudgetGenerateButton eventId={event.id} />
            </CardContent>
          </Card>
        ) : (
          <div className="mt-8 space-y-8">
            <BudgetSummary event={event} items={items} />
            <BudgetTable event={event} items={items} />
            <div className="flex justify-end">
              <BudgetGenerateButton eventId={event.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

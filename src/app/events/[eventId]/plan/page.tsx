import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getEventById, getEventPlan } from '@/services/events'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { GeneratePlanButton } from '@/components/events/generate-plan-button'
import { BudgetGenerateButton } from '@/components/events/budget-generate-button'
import type { GeneratedPlan } from '@/types/database'

const PRIORITY_STYLES: Record<
  GeneratedPlan['vendor_categories'][number]['priority'],
  string
> = {
  essential: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-transparent',
  recommended: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-transparent',
  optional: 'bg-slate-100 text-slate-700 hover:bg-slate-100 border-transparent',
}

export default async function EventPlanPage({
  params,
}: {
  params: { eventId: string }
}) {
  const user = await requireAuth()
  const event = await getEventById(params.eventId, user.id)
  if (!event) redirect('/dashboard')

  const planRow = await getEventPlan(params.eventId)

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/events/${event.id}`}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to Event
        </Link>

        <header className="mt-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {event.title}
          </h1>
          <p className="mt-1 text-slate-600">AI-generated event plan</p>
        </header>

        {!planRow ? (
          <Card className="mt-8 border-dashed border-slate-300">
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <p className="text-base font-medium text-slate-900">
                No plan generated yet
              </p>
              <p className="max-w-md text-sm text-slate-600">
                Head back to the event overview and click{' '}
                <span className="font-medium">Generate AI Plan</span> to create
                one.
              </p>
              <Link
                href={`/events/${event.id}`}
                className={buttonVariants({ variant: 'outline' })}
              >
                Back to Event
              </Link>
            </CardContent>
          </Card>
        ) : (
          <PlanSections plan={planRow} eventId={event.id} />
        )}
      </div>
    </div>
  )
}

function PlanSections({
  plan,
  eventId,
}: {
  plan: {
    concept_summary: string | null
    timeline: unknown
    vendor_categories: unknown
    recommendations: unknown
  }
  eventId: string
}) {
  const timeline = (plan.timeline ?? []) as GeneratedPlan['timeline']
  const vendors = (plan.vendor_categories ?? []) as GeneratedPlan['vendor_categories']
  const recommendations = (plan.recommendations ??
    []) as GeneratedPlan['recommendations']

  return (
    <div className="mt-8 space-y-10">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Event Concept
        </h2>
        <Card className="border-indigo-200 bg-indigo-50">
          <CardContent className="p-6">
            <p className="text-slate-800">
              {plan.concept_summary ?? 'No concept summary captured.'}
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Timeline</h2>
        <Card className="border-slate-200">
          <CardContent className="divide-y divide-slate-100 p-0">
            {timeline.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">
                No timeline items yet.
              </p>
            ) : (
              timeline.map((item, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[80px_1fr] gap-4 px-5 py-4 sm:grid-cols-[110px_1fr]"
                >
                  <p className="font-mono text-sm font-semibold text-indigo-600">
                    {item.time}
                  </p>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {item.activity}
                    </p>
                    {item.notes && (
                      <p className="mt-1 text-sm text-slate-600">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Vendor Categories
        </h2>
        {vendors.length === 0 ? (
          <p className="text-sm text-slate-500">No vendor categories yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {vendors.map((v, i) => (
              <Card key={i} className="border-slate-200">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">{v.name}</h3>
                    <Badge className={PRIORITY_STYLES[v.priority]}>
                      {v.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{v.description}</p>
                  <p className="text-sm font-medium text-slate-900">
                    Estimated cost: {v.estimated_cost}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Recommendations
        </h2>
        {recommendations.length === 0 ? (
          <p className="text-sm text-slate-500">No recommendations yet.</p>
        ) : (
          <div className="space-y-3">
            {recommendations.map((r, i) => (
              <Card key={i} className="border-slate-200">
                <CardContent className="space-y-1 p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                    {r.category}
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {r.suggestion}
                  </p>
                  <p className="text-sm text-slate-600">Why: {r.reason}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <BudgetGenerateButton eventId={eventId} />
        <GeneratePlanButton eventId={eventId} mode="regenerate" />
      </div>
    </div>
  )
}

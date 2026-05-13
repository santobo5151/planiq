import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getEventById, getEventPlan } from '@/services/events'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { PlanEditor } from '@/components/events/plan-editor'

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
          <PlanEditor eventId={event.id} plan={planRow} />
        )}
      </div>
    </div>
  )
}

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getEventById } from '@/services/events'
import { getCommentsForEvent } from '@/services/plan-comments'
import { getMarketFromLocation } from '@/lib/localisation'
import { CommentsPageClient } from './_components/CommentsPageClient'
import type { PlanCommentReply, PlanCommentTopLevel, GroupedComments } from '@/types/database'

type EnrichedReply = PlanCommentReply & { created_at_display: string }

type EnrichedTopLevel = Omit<PlanCommentTopLevel, 'replies'> & {
  created_at_display: string
  resolved_at_display: string | null
  replies: EnrichedReply[]
}

type EnrichedGroupedComments = {
  plan: EnrichedTopLevel[]
  budget: EnrichedTopLevel[]
  checklist: EnrichedTopLevel[]
}

function enrichComments(raw: GroupedComments, fmt: Intl.DateTimeFormat): EnrichedGroupedComments {
  function enrichTopLevel(c: PlanCommentTopLevel): EnrichedTopLevel {
    return {
      ...c,
      created_at_display: fmt.format(new Date(c.created_at)),
      resolved_at_display: c.resolved_at ? fmt.format(new Date(c.resolved_at)) : null,
      replies: c.replies.map((r: PlanCommentReply): EnrichedReply => ({
        ...r,
        created_at_display: fmt.format(new Date(r.created_at)),
      })),
    }
  }

  return {
    plan: raw.plan.map(enrichTopLevel),
    budget: raw.budget.map(enrichTopLevel),
    checklist: raw.checklist.map(enrichTopLevel),
  }
}

export default async function CommentsPage({
  params,
}: {
  params: { eventId: string }
}) {
  const user = await requireAuth()
  const event = await getEventById(params.eventId, user.id)
  if (!event) redirect('/dashboard')

  if (event.planner_id !== user.id && event.created_by !== user.id) {
    redirect('/dashboard')
  }

  const raw = await getCommentsForEvent(params.eventId)

  const market = getMarketFromLocation(event.location)
  const tz = market === 'nigeria' ? 'Africa/Lagos' : 'Europe/London'
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const enriched = enrichComments(raw, fmt)

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/events/${params.eventId}`}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to event
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Client Comments
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review and reply to comments left by your client on the plan, budget, and checklist.
          </p>
        </div>

        <div className="mt-8">
          <CommentsPageClient
            comments={enriched}
            plannerId={user.id}
          />
        </div>
      </div>
    </div>
  )
}

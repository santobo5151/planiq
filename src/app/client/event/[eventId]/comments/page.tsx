export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAuth, getUserProfile } from '@/lib/auth'
import { getClientEvent } from '@/services/client-events'
import { getCommentsForEvent } from '@/services/client-plan-comments'
import { getMarketFromLocation } from '@/lib/localisation'
import { ClientCommentsPageClient } from './_components/ClientCommentsPageClient'
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

export default async function ClientCommentsPage({
  params,
}: {
  params: { eventId: string }
}) {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile?.role) redirect('/onboarding')
  if (profile.role !== 'client') {
    redirect(profile.role === 'planner' ? '/dashboard' : '/client/dashboard')
  }

  const event = await getClientEvent(params.eventId)
  if (!event) redirect('/client/dashboard')

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
          href={`/client/event/${params.eventId}`}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to event
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Your Comments</h1>
          <p className="mt-1 text-sm text-slate-500">
            Post questions or feedback on your plan. Your planner will respond.
          </p>
        </div>

        <div className="mt-8">
          <ClientCommentsPageClient
            comments={enriched}
            eventId={params.eventId}
            clientUserId={user.id}
          />
        </div>
      </div>
    </div>
  )
}

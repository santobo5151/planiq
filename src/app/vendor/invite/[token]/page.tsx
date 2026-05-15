export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getVendorInviteByToken } from '@/services/vendor-invites'
import { AcceptVendorInviteButton } from './_components/AcceptVendorInviteButton'

export default async function VendorInvitePage({
  params,
}: {
  params: { token: string }
}) {
  const context = await getVendorInviteByToken(params.token)

  if (!context) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center space-y-3">
          <p className="text-lg font-semibold text-slate-900">
            Invalid invite link
          </p>
          <p className="text-sm text-slate-500">
            This invite link is invalid. Please contact the planner who sent it.
          </p>
        </div>
      </div>
    )
  }

  if (context.alreadyAccepted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center space-y-3">
          <p className="text-lg font-semibold text-slate-900">
            Invite already accepted
          </p>
          <p className="text-sm text-slate-500">
            You&apos;ve already accepted this invite. Sign in to your vendor
            account to review.
          </p>
          <Link
            href="/vendor/login"
            className="inline-block text-sm font-medium text-indigo-600 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    )
  }

  const { event, category, plannerNote, plannerName, inviteEmail } = context

  const formattedDate = event.event_date
    ? new Date(event.event_date).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            {event.title}: {category}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {plannerName ?? 'A planner'} would like to book you for this event.
          </p>
        </div>

        {/* Event details */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-1 text-sm text-slate-700">
          {formattedDate && (
            <p>
              <span className="font-medium">Date:</span> {formattedDate}
            </p>
          )}
          {event.location && (
            <p>
              <span className="font-medium">Location:</span> {event.location}
            </p>
          )}
          {event.event_type && (
            <p>
              <span className="font-medium">Event type:</span> {event.event_type}
            </p>
          )}
          <p>
            <span className="font-medium">Service requested:</span> {category}
          </p>
        </div>

        {/* Planner's note */}
        {plannerNote && (
          <blockquote className="border-l-4 border-slate-200 pl-4 text-sm text-slate-600 italic">
            {plannerNote}
          </blockquote>
        )}

        {/* Invite email */}
        <p className="text-sm text-slate-500">
          Invite sent to:{' '}
          <span className="font-medium text-slate-700">{inviteEmail}</span>
        </p>

        {/* Accept button */}
        <AcceptVendorInviteButton email={inviteEmail} token={params.token} />

        {/* Footer note */}
        <p className="text-xs text-slate-400 text-center">
          Clicking the button below will email you a secure sign-in link. The
          link expires in 1 hour — if it does, open this invite link again to
          request a new one. The invite itself doesn&apos;t expire.
        </p>
      </div>
    </div>
  )
}

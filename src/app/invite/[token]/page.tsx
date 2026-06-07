import Link from 'next/link'
import { getInviteByToken } from '@/services/invites'
import { Wordmark } from '@/components/brand/Wordmark'
import { Card, CardContent } from '@/components/ui/card'
import { AcceptInviteButton } from './_components/AcceptInviteButton'

function formatDate(date: string | null): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function InvitePage({
  params,
}: {
  params: { token: string }
}) {
  const result = await getInviteByToken(params.token)

  if (!result) {
    return (
      <PageShell>
        <Card className="w-full max-w-md border-slate-200">
          <CardContent className="p-8 text-center">
            <p className="text-base font-semibold text-slate-900">
              Invalid invite link
            </p>
            <p className="mt-2 text-sm text-slate-500">
              This invite link is invalid or no longer available. Please check
              with your planner.
            </p>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  const { invite, event, plannerName } = result

  if (invite.accepted_at !== null) {
    return (
      <PageShell>
        <Card className="w-full max-w-md border-slate-200">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-base font-semibold text-slate-900">
              Already accepted
            </p>
            <p className="text-sm text-slate-500">
              You&apos;ve already accepted this invite. Sign in to access your
              event.
            </p>
            <Link
              href="/client/login"
              className="inline-block rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Sign in
            </Link>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  const eventDate = formatDate(event.event_date)

  return (
    <PageShell>
      <Card className="w-full max-w-md border-slate-200">
        <CardContent className="space-y-6 p-8">
          <div className="text-center space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
              You&apos;re invited
            </p>
            <h1 className="text-xl font-bold text-slate-900">
              PlanIQ Collaboration
            </h1>
          </div>

          <div className="rounded-lg bg-slate-50 p-4 space-y-2 text-sm">
            <p className="text-slate-700">
              <span className="font-medium">
                {plannerName ?? 'Your planner'}
              </span>{' '}
              has invited you to collaborate on{' '}
              <span className="font-medium">{event.title}</span>
            </p>
            {eventDate && (
              <p className="text-slate-500">{eventDate}</p>
            )}
            <p className="text-slate-400 text-xs pt-1">
              Invite sent to: {invite.email}
            </p>
          </div>

          <AcceptInviteButton email={invite.email} token={invite.token} />

          <p className="text-xs text-slate-400 text-center leading-relaxed">
            After clicking, we&apos;ll email you a secure sign-in link. That
            link expires in 1 hour — if it does, just refresh this page and
            click again.
          </p>
        </CardContent>
      </Card>
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50 px-4 py-12 flex flex-col items-center justify-center">
      <Link href="/" aria-label="PlanIQ home" className="mb-8">
        <Wordmark className="text-2xl" />
      </Link>
      {children}
    </div>
  )
}

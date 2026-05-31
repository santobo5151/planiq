import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Calendar, MapPin } from 'lucide-react'
import { requireAuth, getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getVendorAssignments } from '@/services/vendor-portal'
import { getMarketFromLocation } from '@/lib/localisation'
import { VendorHeader } from '@/app/vendor/_components/VendorHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { VendorAssignmentListItem } from '@/types/database'

type EnrichedAssignmentItem = VendorAssignmentListItem & {
  event_date_display: string | null
}

function enrichItem(item: VendorAssignmentListItem): EnrichedAssignmentItem {
  const market = getMarketFromLocation(item.event.location)
  const tz = market === 'nigeria' ? 'Africa/Lagos' : 'Europe/London'
  const event_date_display = item.event.event_date
    ? new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(new Date(item.event.event_date))
    : null
  return { ...item, event_date_display }
}

type VendorUserRow = {
  business_name: string | null
  contact_name: string | null
  category: string | null
}

export default async function VendorDashboardPage({
  searchParams,
}: {
  searchParams: { saved?: string }
}) {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile || profile.role !== 'vendor') {
    redirect('/auth/callback-error?message=Vendor%20account%20required')
  }

  const supabase = createClient()
  const { data: vendorUserRow } = await supabase
    .from('vendor_users')
    .select('business_name, contact_name, category')
    .eq('id', user.id)
    .maybeSingle()

  const vendorUser = vendorUserRow as VendorUserRow | null
  const vendorName =
    vendorUser?.business_name ?? vendorUser?.contact_name ?? profile.full_name ?? null

  const profileIncomplete =
    !vendorUser ||
    !vendorUser.business_name?.trim() ||
    !vendorUser.contact_name?.trim() ||
    !vendorUser.category?.trim()

  const showSavedBanner = searchParams.saved === '1' && !profileIncomplete

  const assignments = await getVendorAssignments(user.id)
  const enriched = assignments.map(enrichItem)

  const invited = enriched
    .filter((a) => a.status === 'invited')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  const responded = enriched
    .filter((a) => a.status === 'confirmed' || a.status === 'declined')
    .sort((a, b) => {
      const aDate = a.responded_at ?? a.created_at
      const bDate = b.responded_at ?? b.created_at
      return bDate.localeCompare(aDate)
    })

  return (
    <div className="min-h-screen bg-slate-50">
      <VendorHeader vendorName={vendorName} />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        {/* ── Profile banners ──────────────────────────────────────────────── */}
        {profileIncomplete && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Complete your vendor profile
                </p>
                <p className="mt-0.5 text-sm text-amber-700">
                  Add your business details so planners can find you and reach out
                  about bookings.
                </p>
              </div>
              <Link
                href="/vendor/onboarding"
                className="shrink-0 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
              >
                Add details
              </Link>
            </div>
          </div>
        )}

        {showSavedBanner && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
            <p className="text-sm font-semibold text-emerald-800">
              Profile saved.{' '}
              <span className="font-normal">
                Planners can now see your details.
              </span>
            </p>
          </div>
        )}

        {/* ── Page heading ─────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Your bookings
          </h1>
        </div>

        {enriched.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="p-8 text-center">
              <p className="text-sm font-medium text-slate-900">No bookings yet</p>
              <p className="mt-1 text-sm text-slate-500">
                You don&apos;t have any bookings yet. The planner will send you an invite
                when they&apos;re ready to book you.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
            {invited.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900">
                    Needs your response
                  </h2>
                  <Badge variant="warning">
                    {invited.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {invited.map((item) => (
                    <AssignmentCard key={item.event_vendor_id} item={item} showActions />
                  ))}
                </div>
              </section>
            )}

            {responded.length > 0 && (
              <section>
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900">
                    Past responses
                  </h2>
                  <Badge variant="secondary">
                    {responded.length}
                  </Badge>
                </div>
                <div className="space-y-3">
                  {responded.map((item) => (
                    <AssignmentCard key={item.event_vendor_id} item={item} showActions={false} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function AssignmentCard({
  item,
  showActions,
}: {
  item: EnrichedAssignmentItem
  showActions: boolean
}) {
  const hasDate = item.event.event_date !== null
  const hasLocation = item.event.location !== null
  const detailsPending = !hasDate && !hasLocation

  return (
    <Link
      href={`/vendor/event/${item.event.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-slate-900 group-hover:text-indigo-600">
            {item.event.title}
          </h3>
          {item.vendor_directory_category && (
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-indigo-600">
              {item.vendor_directory_category}
            </p>
          )}
        </div>
        <StatusBadge status={item.status} />
      </div>

      <div className="mt-3 space-y-1.5">
        {detailsPending ? (
          <p className="text-sm text-slate-400">Details pending</p>
        ) : (
          <>
            {item.event_date_display && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {item.event_date_display}
              </div>
            )}
            {hasLocation && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{item.event.location}</span>
              </div>
            )}
          </>
        )}
      </div>

      {showActions && (
        <p className="mt-4 text-xs font-medium text-indigo-600 group-hover:underline">
          Review and respond →
        </p>
      )}
    </Link>
  )
}

function StatusBadge({ status }: { status: 'invited' | 'confirmed' | 'declined' }) {
  if (status === 'invited') {
    return <Badge variant="warning" className="shrink-0">Invited</Badge>
  }
  if (status === 'confirmed') {
    return <Badge variant="success" className="shrink-0">Confirmed</Badge>
  }
  return <Badge variant="destructive" className="shrink-0">Declined</Badge>
}

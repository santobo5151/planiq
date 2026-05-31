import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Calendar, MapPin } from 'lucide-react'
import { requireAuth, getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getVendorAssignmentDetail } from '@/services/vendor-portal'
import { getMarketFromLocation } from '@/lib/localisation'
import { VendorHeader } from '@/app/vendor/_components/VendorHeader'
import { VendorEventActions } from './_components/VendorEventActions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type VendorUserRow = { business_name: string | null; contact_name: string | null }

export default async function VendorEventPage({
  params,
}: {
  params: { eventId: string }
}) {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile || profile.role !== 'vendor') {
    redirect('/auth/callback-error?message=Vendor%20account%20required')
  }

  const detail = await getVendorAssignmentDetail(user.id, params.eventId)
  if (!detail) redirect('/vendor/dashboard')

  const supabase = createClient()
  const { data: vendorUserRow } = await supabase
    .from('vendor_users')
    .select('business_name, contact_name')
    .eq('id', user.id)
    .maybeSingle()

  const vendorUser = vendorUserRow as VendorUserRow | null
  const vendorName =
    vendorUser?.business_name ?? vendorUser?.contact_name ?? profile.full_name ?? null

  const market = getMarketFromLocation(detail.event.location)
  const tz = market === 'nigeria' ? 'Africa/Lagos' : 'Europe/London'

  const dateFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const event_date_display = detail.event.event_date
    ? dateFmt.format(new Date(detail.event.event_date))
    : null

  const responded_at_display = detail.responded_at
    ? dateFmt.format(new Date(detail.responded_at))
    : null

  const hasDate = event_date_display !== null
  const hasLocation = detail.event.location !== null
  const detailsPending = !hasDate && !hasLocation

  return (
    <div className="min-h-screen bg-slate-50">
      <VendorHeader vendorName={vendorName} />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <Link
          href="/vendor/dashboard"
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          ← Back to bookings
        </Link>

        <div className="mt-6 mb-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {detail.event.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Planned by{' '}
            <span className="font-medium text-slate-700">
              {detail.planner_name ?? 'your planner'}
            </span>
          </p>
        </div>

        {/* ── Event details card ─────────────────────────────────────────────── */}
        <Card className="mt-6 border-slate-200">
          <CardContent className="p-6 space-y-4">
            {detailsPending ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                Details pending
              </div>
            ) : (
              <>
                {hasDate && (
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                      <Calendar className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Date
                      </p>
                      <p className="text-sm font-medium text-slate-900">{event_date_display}</p>
                    </div>
                  </div>
                )}
                {hasLocation && (
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Location
                      </p>
                      <p className="text-sm font-medium text-slate-900">{detail.event.location}</p>
                    </div>
                  </div>
                )}
              </>
            )}

            {detail.vendor_directory_category && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Category
                </p>
                <p className="mt-0.5 text-sm font-medium text-slate-900">
                  {detail.vendor_directory_category}
                </p>
              </div>
            )}

            {detail.planner_note && (
              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                  Note from the planner
                </p>
                <p className="mt-1 text-sm text-slate-800 leading-relaxed">
                  {detail.planner_note}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Status section ────────────────────────────────────────────────── */}
        <Card className="mt-6 border-slate-200">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-slate-700">Status</p>
              {detail.status === 'invited' && (
                <Badge variant="warning">Invited</Badge>
              )}
              {detail.status === 'confirmed' && (
                <Badge variant="success">Confirmed</Badge>
              )}
              {detail.status === 'declined' && (
                <Badge variant="destructive">Declined</Badge>
              )}
            </div>

            {detail.status === 'invited' && (
              <VendorEventActions eventVendorId={detail.event_vendor_id} />
            )}

            {detail.status === 'confirmed' && (
              <p className="text-sm text-slate-500">
                {responded_at_display
                  ? `You confirmed this booking on ${responded_at_display}.`
                  : 'You confirmed this booking.'}
              </p>
            )}

            {detail.status === 'declined' && (
              <p className="text-sm text-slate-500">
                {responded_at_display
                  ? `You declined this booking on ${responded_at_display}.`
                  : 'You declined this booking.'}
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

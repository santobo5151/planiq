import { redirect } from 'next/navigation'
import { requireAuth, getUserProfile } from '@/lib/auth'
import { getEventById } from '@/services/events'
import { getVendors, getEventVendors } from '@/services/vendors'
import { EventVendorManager } from '@/components/vendors/event-vendor-manager'

export default async function EventVendorsPage({
  params,
}: {
  params: { eventId: string }
}) {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile?.role) redirect('/onboarding')
  if (profile.role === 'client') redirect('/client/dashboard')

  const event = await getEventById(params.eventId, user.id)
  if (!event) redirect('/dashboard')

  const [eventVendors, allVendors] = await Promise.all([
    getEventVendors(params.eventId),
    getVendors(user.id),
  ])

  return (
    <EventVendorManager
      event={event}
      initialEventVendors={eventVendors}
      allVendors={allVendors}
    />
  )
}

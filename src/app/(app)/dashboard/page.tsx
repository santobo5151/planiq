import { redirect } from 'next/navigation'
import { requireAuth, getUserProfile } from '@/lib/auth'
import { getPlannerEvents } from '@/services/events'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { StatsBar } from '@/components/dashboard/stats-bar'
import { EventsList } from '@/components/dashboard/events-list'

export default async function DashboardPage() {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile) redirect('/login')
  if (!profile.role) redirect('/onboarding')
  if (profile.role === 'client') redirect('/client/dashboard')

  const events = await getPlannerEvents(user.id)
  const firstName = profile.full_name?.trim().split(' ')[0] || null

  return (
    <div className="space-y-8">
      <DashboardHeader firstName={firstName} />
      <StatsBar events={events} />
      <EventsList events={events} />
    </div>
  )
}

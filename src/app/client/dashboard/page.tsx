import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { requireAuth, getUserProfile } from '@/lib/auth'
import { Card, CardContent } from '@/components/ui/card'
import { LogoutButton } from '@/components/dashboard/logout-button'

export default async function ClientDashboardPlaceholder() {
  await requireAuth()
  const profile = await getUserProfile()

  if (!profile?.role) redirect('/onboarding')
  if (profile.role === 'planner') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50 px-4 py-12">
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <Link
          href="/"
          className="mb-8 text-3xl font-bold tracking-tight text-indigo-600"
        >
          PlanIQ
        </Link>
        <Card className="w-full border-slate-200">
          <CardContent className="space-y-4 p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">
              Client dashboard coming soon
            </h1>
            <p className="text-sm text-slate-600">
              We&apos;re building your experience. Check back shortly — your
              planner will keep you posted.
            </p>
            <div className="pt-2">
              <LogoutButton />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

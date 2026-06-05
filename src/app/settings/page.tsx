import Link from 'next/link'
import { requireAuth, getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Settings | PlanIQ' }

export default async function SettingsPage() {
  await requireAuth()
  const profile = await getUserProfile()
  if (!profile?.role) redirect('/onboarding')
  if (profile.role === 'client') redirect('/client/dashboard')
  if (profile.role === 'vendor') redirect('/vendor/dashboard')
  if (profile.role !== 'planner') redirect('/onboarding')

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:underline">
          ← Back to Dashboard
        </Link>
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Settings
          </h1>
          <p className="mt-3 text-slate-600">
            Account and profile settings are coming soon. For now, you can manage events from your dashboard.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

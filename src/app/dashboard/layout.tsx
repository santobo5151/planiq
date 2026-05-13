import Link from 'next/link'
import { Calendar, LayoutDashboard, Settings, Store, type LucideIcon } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/dashboard/logout-button'
import type { Profile } from '@/types/database'

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/dashboard/vendors', label: 'Vendors', icon: Store },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth()

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .maybeSingle<Profile>()

  const displayName = profile?.full_name ?? user?.email ?? 'Account'
  const displayEmail = user?.email ?? ''

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile top nav */}
      <header className="border-b border-slate-200 bg-white lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="text-xl font-bold tracking-tight text-indigo-600"
          >
            PlanIQ
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className="rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-indigo-600"
              >
                <Icon className="h-5 w-5" />
              </Link>
            ))}
            <div className="ml-1 border-l border-slate-200 pl-1">
              <LogoutButton />
            </div>
          </nav>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
          <div className="flex h-16 items-center px-6">
            <Link
              href="/dashboard"
              className="text-2xl font-bold tracking-tight text-indigo-600"
            >
              PlanIQ
            </Link>
          </div>
          <nav className="flex-1 space-y-1 px-3">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="space-y-3 border-t border-slate-200 p-3">
            <div className="px-3">
              <p className="truncate text-sm font-medium text-slate-900">
                {displayName}
              </p>
              {displayEmail && (
                <p className="truncate text-xs text-slate-500">{displayEmail}</p>
              )}
            </div>
            <LogoutButton />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 lg:ml-64 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

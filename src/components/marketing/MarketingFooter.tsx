import Link from 'next/link'
import { Wordmark } from '@/components/brand/Wordmark'

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Wordmark className="text-base" />
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">
              Log in
            </Link>
            <Link href="/signup" className="text-sm text-slate-600 hover:text-slate-900">
              Sign up
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500 sm:text-right">
          © 2026 PlanIQ. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

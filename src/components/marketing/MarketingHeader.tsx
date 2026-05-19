import Link from 'next/link'
import { Wordmark } from '@/components/brand/Wordmark'

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="PlanIQ home">
          <Wordmark className="text-xl" />
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:inline"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  )
}

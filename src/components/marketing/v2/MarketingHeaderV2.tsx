import Link from 'next/link'
import { Wordmark } from '@/components/brand/Wordmark'

export function MarketingHeaderV2() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/20 bg-white/30 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="PlanIQ home">
          <Wordmark className="text-xl" />
        </Link>

        <nav className="hidden md:flex md:items-center md:gap-7">
          <Link href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Features
          </Link>
          <Link href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            How it works
          </Link>
          <Link href="#faq" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors sm:inline"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  )
}

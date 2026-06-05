import Link from 'next/link'
import { NewsletterForm } from './NewsletterForm'
import { Wordmark } from '@/components/brand/Wordmark'

export function MarketingFooterV2() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand */}
          <div>
            <Wordmark tone="dark" className="text-xl" />
            <p className="mt-4 text-sm text-slate-400">
              AI-powered event planning, built for Africa.
            </p>
          </div>

          {/* Column 2: Product */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Product</h3>
            <ul className="flex flex-col gap-3">
              <li>
                <Link href="/#features" className="text-sm text-slate-400 hover:text-white transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="text-sm text-slate-400 hover:text-white transition-colors">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="text-sm text-slate-400 hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Stay in the loop */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Stay in the loop</h3>
            <p className="text-sm text-slate-400 mb-4">Get product updates and event-planning tips. No spam.</p>
            <NewsletterForm />
          </div>

          {/* Column 4: Company */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Company</h3>
            <ul className="flex flex-col gap-3">
              <li><Link href="/contact" className="text-sm text-slate-400 hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="text-sm text-slate-400 hover:text-white transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="text-sm text-slate-400 hover:text-white transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 border-t border-slate-700 pt-8">
          <p className="text-xs text-slate-500 text-center sm:text-right">
            © 2026 PlanIQ. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

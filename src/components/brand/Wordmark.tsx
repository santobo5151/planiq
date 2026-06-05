/**
 * Canonical PlanIQ text wordmark. "Plan" in indigo, "IQ" in the accent colour.
 * Use this everywhere the brand name appears as a logo (marketing + app chrome).
 */
import { cn } from '@/lib/utils'

type WordmarkProps = {
  className?: string
  accent?: 'amber' | 'indigo'
  tone?: 'light' | 'dark'
}

export function Wordmark({ className, accent = 'amber', tone = 'light' }: WordmarkProps) {
  return (
    <span className={cn('font-semibold tracking-tight', className)}>
      <span className={tone === 'dark' ? 'text-white' : 'text-indigo-600'}>Plan</span>
      <span className={accent === 'indigo' ? 'text-indigo-600' : tone === 'dark' ? 'text-amber-400' : 'text-amber-500'}>IQ</span>
    </span>
  )
}

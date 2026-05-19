/**
 * Temporary MVP wordmark. Will be replaced with an image-based logo in Phase 10B.
 * Do not treat this as a final brand asset.
 */
import { cn } from '@/lib/utils'

type WordmarkProps = {
  className?: string
  accent?: 'amber' | 'indigo'
}

export function Wordmark({ className, accent = 'amber' }: WordmarkProps) {
  return (
    <span className={cn('font-semibold tracking-tight', className)}>
      <span className="text-indigo-900">Plan</span>
      <span className={accent === 'amber' ? 'text-amber-500' : 'text-indigo-600'}>IQ</span>
    </span>
  )
}

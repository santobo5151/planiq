import Link from 'next/link'
import { LogoutButton } from '@/components/dashboard/logout-button'
import { Wordmark } from '@/components/brand/Wordmark'

interface Props {
  vendorName: string | null
}

export function VendorHeader({ vendorName }: Props) {
  const displayName = vendorName ?? 'Vendor'
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
        <Link href="/vendor/dashboard" className="shrink-0"><Wordmark className="text-lg" /></Link>

        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          Vendor portal
        </span>

        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
          {displayName}
        </span>

        <div className="ml-auto shrink-0">
          <LogoutButton redirectTo="/vendor/login" />
        </div>
      </div>
    </header>
  )
}

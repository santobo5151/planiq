'use client'

import Link from 'next/link'
import { LogoutButton } from '@/components/dashboard/logout-button'
import { Wordmark } from '@/components/brand/Wordmark'

interface Props {
  eventTitle?: string
}

export function ClientHeader({ eventTitle }: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
        <Link href="/client/dashboard" className="shrink-0"><Wordmark className="text-lg" /></Link>

        {eventTitle && (
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
            {eventTitle}
          </span>
        )}

        <div className="ml-auto shrink-0">
          <LogoutButton redirectTo="/client/login" />
        </div>
      </div>
    </header>
  )
}

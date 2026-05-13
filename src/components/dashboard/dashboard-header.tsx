'use client'

import { useEffect, useState } from 'react'

function getGreeting(date: Date) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatToday(date: Date) {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function DashboardHeader({ firstName }: { firstName: string }) {
  const [greeting, setGreeting] = useState<string | null>(null)
  const [today, setToday] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date()
    setGreeting(getGreeting(now))
    setToday(formatToday(now))
  }, [])

  return (
    <div className="space-y-1">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
        {greeting ? `${greeting}, ${firstName}` : `Hello, ${firstName}`}
      </h1>
      {today && <p className="text-sm text-slate-500">{today}</p>}
      <p className="pt-2 text-slate-600">Here is an overview of your events.</p>
    </div>
  )
}

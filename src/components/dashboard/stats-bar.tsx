'use client'

import { Calendar, CalendarCheck, FileText, CheckCircle2 } from 'lucide-react'
import type { Event as PlanIQEvent } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'

export function StatsBar({ events }: { events: PlanIQEvent[] }) {
  const total = events.length
  const draft = events.filter((e) => e.status === 'draft').length
  const active = events.filter((e) => e.status === 'active').length
  const completed = events.filter((e) => e.status === 'completed').length

  const stats = [
    { label: 'Total Events', value: total, icon: Calendar },
    { label: 'Active Events', value: active, icon: CalendarCheck },
    { label: 'Draft Events', value: draft, icon: FileText },
    { label: 'Completed Events', value: completed, icon: CheckCircle2 },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map(({ label, value, icon: Icon }) => (
        <Card key={label} className="border-slate-200">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

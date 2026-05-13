'use client'

import { useState, useTransition } from 'react'
import { CalendarDays, Sparkles } from 'lucide-react'
import { setRole } from './actions'
import type { UserRole } from '@/types/database'
import { Alert, AlertDescription } from '@/components/ui/alert'

const CHOICES: {
  role: UserRole
  title: string
  description: string
  icon: typeof CalendarDays
}[] = [
  {
    role: 'planner',
    title: 'I am an Event Planner',
    description:
      'I plan events for clients and want AI help with timelines, budgets, and vendors.',
    icon: CalendarDays,
  },
  {
    role: 'client',
    title: 'I am planning my own event',
    description:
      'I want help organising my own celebration with AI-generated plans and checklists.',
    icon: Sparkles,
  },
]

export function OnboardingChoices() {
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<UserRole | null>(null)
  const [error, setError] = useState<string | null>(null)

  function choose(role: UserRole) {
    setError(null)
    setSelected(role)
    startTransition(async () => {
      try {
        await setRole(role)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.')
        setSelected(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {CHOICES.map(({ role, title, description, icon: Icon }) => {
          const isSelected = selected === role
          return (
            <button
              key={role}
              type="button"
              onClick={() => choose(role)}
              disabled={pending}
              className={`group relative flex flex-col items-start gap-3 rounded-xl border-2 p-6 text-left transition-all ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-lg font-semibold text-slate-900">
                {title}
              </span>
              <span className="text-sm text-slate-600">{description}</span>
              {isSelected && pending && (
                <span className="text-xs font-medium text-indigo-600">
                  Saving…
                </span>
              )}
            </button>
          )
        })}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

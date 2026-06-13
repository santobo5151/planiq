'use client'

import { useState, useTransition } from 'react'
import { CalendarDays, Sparkles } from 'lucide-react'
import { setRole } from './actions'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function OnboardingChoices() {
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<'professional' | 'self' | null>(null)
  const [businessName, setBusinessName] = useState('')
  const [businessNameError, setBusinessNameError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function selectProfessional() {
    if (pending) return
    setSelected('professional')
    setBusinessNameError(null)
    setError(null)
  }

  function handleProfessionalSubmit() {
    const trimmed = businessName.trim()
    if (!trimmed) {
      setBusinessNameError('Please enter your business name.')
      return
    }
    setBusinessNameError(null)
    setError(null)
    startTransition(async () => {
      try {
        await setRole('planner', trimmed, 'professional')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.')
      }
    })
  }

  function handleSelfSubmit() {
    setSelected('self')
    setError(null)
    startTransition(async () => {
      try {
        await setRole('planner', undefined, 'self')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.')
        setSelected(null)
      }
    })
  }

  const isProfSelected = selected === 'professional'
  const isSelfSelected = selected === 'self'

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Professional card */}
        <div
          className={`rounded-xl border-2 p-6 transition-all ${
            isProfSelected
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md'
          }`}
        >
          <button
            type="button"
            onClick={selectProfessional}
            disabled={pending}
            className="group flex w-full flex-col items-start gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
              <CalendarDays className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold text-slate-900">
              I am an Event Planner
            </span>
            <span className="text-sm text-slate-600">
              I plan events for clients and want AI help with timelines, budgets, and vendors.
            </span>
          </button>

          {isProfSelected && (
            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="businessName"
                  className="text-sm font-medium text-slate-700"
                >
                  Business name
                </label>
                <input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value)
                    setBusinessNameError(null)
                  }}
                  maxLength={100}
                  disabled={pending}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
                />
                {businessNameError && (
                  <p className="text-xs text-red-600">{businessNameError}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleProfessionalSubmit}
                disabled={pending}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? 'Saving…' : 'Continue'}
              </button>
            </div>
          )}
        </div>

        {/* Self card */}
        <div
          className={`rounded-xl border-2 p-6 transition-all ${
            isSelfSelected
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md'
          }`}
        >
          <button
            type="button"
            onClick={handleSelfSubmit}
            disabled={pending}
            className="group flex w-full flex-col items-start gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold text-slate-900">
              I am planning my own event
            </span>
            <span className="text-sm text-slate-600">
              I want help organising my own celebration with AI-generated plans and checklists.
            </span>
            {isSelfSelected && pending && (
              <span className="text-xs font-medium text-indigo-600">Saving…</span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

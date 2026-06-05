'use client'

import { useState, useTransition } from 'react'
import { subscribeToNewsletterAction, type SubscribeResult } from '@/app/actions/newsletter'

export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<SubscribeResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    startTransition(async () => {
      setResult(null)
      const res = await subscribeToNewsletterAction({ email, source: 'v2_footer' })
      setResult(res)
      if (res.success) setEmail('')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 max-w-xs">
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button
        type="submit"
        disabled={isPending}
        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? 'Subscribing…' : 'Subscribe'}
      </button>
      <div aria-live="polite">
        {result?.success ? (
          <p className="mt-2 text-xs text-emerald-400">Thanks, you&apos;re on the list.</p>
        ) : result ? (
          <p className="mt-2 text-xs text-rose-400">{result.error}</p>
        ) : null}
      </div>
    </form>
  )
}

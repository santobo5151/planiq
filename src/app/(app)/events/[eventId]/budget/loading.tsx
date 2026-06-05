import { Skeleton } from '@/components/ui/skeleton'

export default function BudgetLoading() {
  return (
    <div className="mx-auto max-w-5xl">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-6 h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-slate-200">
          <div className="bg-slate-50 px-3 py-2">
            <div className="flex gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-20" />
              ))}
            </div>
          </div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex gap-4 border-t border-slate-100 px-3 py-3">
              {[...Array(6)].map((_, j) => (
                <Skeleton key={j} className="h-4 w-20" />
              ))}
            </div>
          ))}
        </div>
    </div>
  )
}

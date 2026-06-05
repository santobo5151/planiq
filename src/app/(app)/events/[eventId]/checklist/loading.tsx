import { Skeleton } from '@/components/ui/skeleton'

export default function ChecklistLoading() {
  return (
    <div className="mx-auto max-w-3xl">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-6 h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
        <Skeleton className="mt-4 h-9 w-44" />

        <div className="mt-8 space-y-3">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-3 w-full rounded-full" />
        </div>

        {[...Array(3)].map((_, g) => (
          <div key={g} className="mt-8 space-y-2">
            <Skeleton className="h-4 w-28" />
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ))}
    </div>
  )
}

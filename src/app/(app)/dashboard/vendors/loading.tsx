import { Skeleton } from '@/components/ui/skeleton'

export default function VendorDirectoryLoading() {
  return (
    <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Skeleton className="h-9 w-full max-w-sm" />
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
    </div>
  )
}

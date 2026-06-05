import { Skeleton } from '@/components/ui/skeleton'

export default function EventVendorsLoading() {
  return (
    <div className="mx-auto max-w-3xl">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-6 h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-36" />

        <Skeleton className="mt-8 h-24 w-full rounded-lg" />

        <div className="mt-8 space-y-3">
          <Skeleton className="h-5 w-36" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
    </div>
  )
}

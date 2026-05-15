import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'

export default function CallbackErrorPage({
  searchParams,
}: {
  searchParams: { message?: string }
}) {
  const message =
    searchParams.message?.trim() ||
    'Something went wrong while signing you in.'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50 px-4 py-12 flex flex-col items-center justify-center">
      <Link
        href="/"
        className="mb-8 text-2xl font-bold tracking-tight text-indigo-600"
      >
        PlanIQ
      </Link>

      <Card className="w-full max-w-md border-slate-200">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-xl text-slate-900">
            We couldn&apos;t sign you in
          </CardTitle>
          <CardDescription className="text-slate-600">{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Link
            href="/client/login"
            className={buttonVariants({
              className: 'w-full bg-indigo-600 text-white hover:bg-indigo-700',
            })}
          >
            Try again
          </Link>
          <p className="text-sm text-slate-500">
            If you&apos;re a planner, you can also{' '}
            <Link
              href="/login"
              className="font-medium text-indigo-600 hover:underline"
            >
              sign in here
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ClientLoginForm } from './_components/ClientLoginForm'

export default function ClientLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50 px-4 py-12 flex flex-col items-center justify-center">
      <Link
        href="/"
        className="mb-8 text-2xl font-bold tracking-tight text-indigo-600"
      >
        PlanIQ
      </Link>

      <Card className="w-full max-w-md border-slate-200">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-slate-900">Client sign-in</CardTitle>
          <CardDescription className="text-slate-600">
            Enter the email address your planner sent the invite to. We&apos;ll
            send you a secure sign-in link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientLoginForm />
        </CardContent>
      </Card>

      <p className="mt-6 max-w-md text-center text-sm text-slate-500">
        If you haven&apos;t accepted your invite yet, please use the link in
        your invite email instead.
      </p>
    </div>
  )
}

import Link from 'next/link'
import { Wordmark } from '@/components/brand/Wordmark'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { VendorLoginForm } from './_components/VendorLoginForm'

export default function VendorLoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50 px-4 py-12 flex flex-col items-center justify-center">
      <Link href="/" aria-label="PlanIQ home" className="mb-8">
        <Wordmark className="text-2xl" />
      </Link>

      <Card className="w-full max-w-md border-slate-200">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-slate-900">Vendor sign-in</CardTitle>
          <CardDescription className="text-slate-600">
            Enter the email address linked to your vendor account. We&apos;ll
            send you a secure sign-in link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VendorLoginForm />
        </CardContent>
      </Card>

      <p className="mt-6 max-w-md text-center text-sm text-slate-500">
        If you haven&apos;t accepted your invite yet, please use the link in
        your invite email instead.
      </p>
    </div>
  )
}

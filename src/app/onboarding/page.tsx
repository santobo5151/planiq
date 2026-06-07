import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { buttonVariants } from '@/components/ui/button'
import { OnboardingChoices } from './onboarding-choices'
import { Wordmark } from '@/components/brand/Wordmark'

export default async function OnboardingPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    return <OnboardingError message={`Could not load your profile: ${error.message}`} />
  }
  if (!profile) {
    return (
      <OnboardingError message="Your profile is missing. This shouldn't happen — please sign out and sign in again, or contact support if it persists." />
    )
  }
  if (profile.role) {
    redirect('/dashboard')
  }

  const firstName = profile.full_name?.split(' ')[0]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <Wordmark className="text-3xl" />
          <h2 className="mt-6 text-2xl font-semibold text-slate-900 sm:text-3xl">
            Welcome{firstName ? `, ${firstName}` : ''} 👋
          </h2>
          <p className="mt-2 text-slate-600">
            Tell us how you&apos;ll be using PlanIQ so we can tailor your experience.
          </p>
        </div>
        <OnboardingChoices />
      </div>
    </div>
  )
}

function OnboardingError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50 px-4 py-12">
      <div className="mx-auto max-w-md space-y-6 text-center">
        <Wordmark className="text-3xl" />
        <Alert variant="destructive" className="text-left">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <Link href="/login" className={buttonVariants({ variant: 'outline' })}>
          Back to login
        </Link>
      </div>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { requireAuth, getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { VendorHeader } from '@/app/vendor/_components/VendorHeader'
import { OnboardingForm } from './_components/OnboardingForm'
import type { VendorUser } from '@/types/database'

export default async function VendorOnboardingPage() {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile || profile.role !== 'vendor') {
    redirect('/auth/callback-error?message=Vendor%20account%20required')
  }

  const supabase = createClient()
  const { data: vendorUserRow } = await supabase
    .from('vendor_users')
    .select('business_name, contact_name, category, phone, location, bio')
    .eq('id', user.id)
    .maybeSingle()

  const vendorUsers = vendorUserRow as Pick<
    VendorUser,
    'business_name' | 'contact_name' | 'category' | 'phone' | 'location' | 'bio'
  > | null

  const vendorName =
    vendorUsers?.business_name ?? vendorUsers?.contact_name ?? profile.full_name ?? null

  const initialValues = {
    business_name: vendorUsers?.business_name ?? '',
    contact_name: vendorUsers?.contact_name ?? '',
    category: vendorUsers?.category ?? '',
    phone: vendorUsers?.phone ?? '',
    location: vendorUsers?.location ?? '',
    bio: vendorUsers?.bio ?? '',
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <VendorHeader vendorName={vendorName} />

      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Your vendor profile
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Tell planners about your business. Required fields are marked with *.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <OnboardingForm initialValues={initialValues} />
        </div>
      </main>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { requireAuth, getUserProfile } from '@/lib/auth'
import { getVendors } from '@/services/vendors'
import { VendorManager } from '@/components/vendors/vendor-manager'

export default async function VendorDirectoryPage() {
  const user = await requireAuth()
  const profile = await getUserProfile()

  if (!profile?.role) redirect('/onboarding')
  if (profile.role === 'client') redirect('/client/dashboard')

  const vendors = await getVendors(user.id)

  return <VendorManager initialVendors={vendors} />
}

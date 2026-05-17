'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveVendorProfileAction } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

interface InitialValues {
  business_name: string
  contact_name: string
  category: string
  phone: string
  location: string
  bio: string
}

interface Props {
  initialValues: InitialValues
}

export function OnboardingForm({ initialValues }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [businessName, setBusinessName] = useState(initialValues.business_name)
  const [contactName, setContactName] = useState(initialValues.contact_name)
  const [category, setCategory] = useState(initialValues.category)
  const [phone, setPhone] = useState(initialValues.phone)
  const [location, setLocation] = useState(initialValues.location)
  const [bio, setBio] = useState(initialValues.bio)

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [validationFailed, setValidationFailed] = useState(false)

  const bioRemaining = Math.max(0, 500 - bio.length)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage(null)

    if (!businessName.trim() || !contactName.trim() || !category.trim()) {
      setValidationFailed(true)
      setErrorMessage('Please fill in the required fields marked with *.')
      return
    }

    setValidationFailed(false)
    startTransition(async () => {
      const result = await saveVendorProfileAction({
        business_name: businessName,
        contact_name: contactName,
        category,
        phone,
        location,
        bio,
      })

      if (result.success) {
        router.replace('/vendor/dashboard?saved=1')
      } else {
        setErrorMessage(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="business_name">Business name *</Label>
        <Input
          id="business_name"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          maxLength={100}
          disabled={isPending}
          aria-invalid={validationFailed && !businessName.trim() ? true : undefined}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact_name">Contact name *</Label>
        <Input
          id="contact_name"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          maxLength={100}
          disabled={isPending}
          aria-invalid={validationFailed && !contactName.trim() ? true : undefined}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Input
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          maxLength={50}
          placeholder="e.g. Photographer, Caterer, DJ"
          disabled={isPending}
          aria-invalid={validationFailed && !category.trim() ? true : undefined}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={30}
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={100}
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={4}
          disabled={isPending}
          aria-describedby="bio-counter"
        />
        <p id="bio-counter" className="text-xs text-slate-500">
          {bioRemaining} characters left
        </p>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-4">
        <Link
          href="/vendor/dashboard"
          className="text-sm font-medium text-slate-500 hover:text-slate-700 hover:underline"
        >
          ← Back to dashboard
        </Link>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70"
        >
          {isPending ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </form>
  )
}

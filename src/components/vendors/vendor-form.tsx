'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  addVendorAction,
  updateVendorAction,
} from '@/app/(app)/dashboard/vendors/actions'
import type { Vendor } from '@/types/database'

const UK_CITIES = [
  'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Sheffield',
  'Liverpool', 'Edinburgh', 'Bristol', 'Cardiff', 'Newcastle', 'Nottingham',
  'Leicester', 'Southampton', 'Portsmouth', 'Oxford', 'Cambridge', 'Brighton',
  'Bath', 'York',
]

const NIGERIA_CITIES = [
  'Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan', 'Benin City', 'Kaduna',
  'Enugu', 'Warri', 'Calabar', 'Jos', 'Ilorin', 'Owerri', 'Uyo', 'Abeokuta',
  'Lekki', 'Victoria Island', 'Ikeja',
]

const CATEGORY_SUGGESTIONS = [
  'Venue', 'Catering', 'Decor', 'Photography', 'Videography', 'MC / Host', 'DJ',
  'Live Band', 'Security', 'Ushers', 'Transport', 'Aso-ebi Coordinator',
  'Cake / Dessert', 'Florist', 'AV / Production', 'Cleaning', 'Event Coordinator',
  'Makeup Artist', 'Hair Stylist', 'Printing / Stationery', 'Souvenirs / Gifts',
  'Generator / Power',
]

interface Props {
  mode: 'add' | 'edit'
  initialData?: Partial<Vendor>
  vendorId?: string
  onSuccess: (vendor: Vendor) => void
  onCancel: () => void
}

export function VendorForm({
  mode,
  initialData,
  vendorId,
  onSuccess,
  onCancel,
}: Props) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [category, setCategory] = useState(initialData?.category ?? '')
  const [email, setEmail] = useState(initialData?.email ?? '')
  const [phone, setPhone] = useState(initialData?.phone ?? '')
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [customLocation, setCustomLocation] = useState('')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const knownCities = [...UK_CITIES, ...NIGERIA_CITIES]
  const isKnownLocation =
    !initialData?.location || knownCities.includes(initialData.location)

  function handleSubmit() {
    setFormError(null)
    const effectiveLocation =
      location === 'Other' ? customLocation.trim() : location.trim()

    const formData = {
      name: name.trim(),
      category: category.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      location: effectiveLocation || undefined,
      notes: notes.trim() || undefined,
    }

    startTransition(async () => {
      if (mode === 'add') {
        const result = await addVendorAction(formData)
        if (result.success) {
          const now = new Date().toISOString()
          onSuccess({
            id: result.vendorId,
            planner_id: '',
            name: formData.name,
            category: formData.category,
            email: formData.email ?? null,
            phone: formData.phone ?? null,
            location: formData.location ?? null,
            notes: formData.notes ?? null,
            created_at: now,
            updated_at: now,
          })
        } else {
          setFormError(result.error)
        }
      } else {
        if (!vendorId) return
        const result = await updateVendorAction(vendorId, formData)
        if (result.success) {
          onSuccess({
            id: vendorId,
            planner_id: initialData?.planner_id ?? '',
            name: formData.name,
            category: formData.category,
            email: formData.email ?? null,
            phone: formData.phone ?? null,
            location: formData.location ?? null,
            notes: formData.notes ?? null,
            created_at: initialData?.created_at ?? '',
            updated_at: new Date().toISOString(),
          })
        } else {
          setFormError(result.error)
        }
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="vf-name">Name *</Label>
          <Input
            id="vf-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Lagos Catering Co."
            className="h-9"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vf-category">Category *</Label>
          <Input
            id="vf-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Catering"
            list="vf-category-suggestions"
            className="h-9"
          />
          <datalist id="vf-category-suggestions">
            {CATEGORY_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vf-email">Email</Label>
          <Input
            id="vf-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vendor@example.com"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="vf-phone">Phone</Label>
          <Input
            id="vf-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+44 7700 900000"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="vf-location">Location</Label>
          <select
            id="vf-location"
            value={isKnownLocation ? location : 'Other'}
            onChange={(e) => {
              setLocation(e.target.value)
              setCustomLocation('')
            }}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Select location</option>
            <optgroup label="United Kingdom">
              {UK_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </optgroup>
            <optgroup label="Nigeria">
              {NIGERIA_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </optgroup>
            <option value="Other">Other</option>
          </select>
          {location === 'Other' && (
            <Input
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="City / location"
              className="mt-2 h-9"
            />
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="vf-notes">Notes</Label>
        <Textarea
          id="vf-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this vendor…"
          className="min-h-[80px]"
        />
      </div>
      {formError && <p className="text-sm text-red-600">{formError}</p>}
      <div className="flex gap-2">
        <Button
          onClick={handleSubmit}
          disabled={pending}
          className="bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {pending
            ? mode === 'add'
              ? 'Adding…'
              : 'Saving…'
            : mode === 'add'
              ? 'Add Vendor'
              : 'Save Changes'}
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

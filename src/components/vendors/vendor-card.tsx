'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2, MapPin, Mail, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deleteVendorAction } from '@/app/(app)/dashboard/vendors/actions'
import { VendorForm } from '@/components/vendors/vendor-form'
import type { Vendor } from '@/types/database'

// ── Category badge colour ─────────────────────────────────────────────────────

const BADGE_PALETTE = [
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-violet-100 text-violet-700 border-violet-200',
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-yellow-100 text-yellow-800 border-yellow-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-rose-100 text-rose-700 border-rose-200',
]

export function categoryBadgeClass(category: string): string {
  let h = 0
  for (let i = 0; i < category.length; i++) {
    h = (h * 31 + category.charCodeAt(i)) | 0
  }
  return BADGE_PALETTE[Math.abs(h) % BADGE_PALETTE.length]
}

// ── VendorCard ────────────────────────────────────────────────────────────────

interface Props {
  vendor: Vendor
  onUpdated: (vendor: Vendor) => void
  onDeleted: (id: string) => void
}

export function VendorCard({ vendor, onUpdated, onDeleted }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletePending, startDelete] = useTransition()

  function executeDelete() {
    startDelete(async () => {
      const result = await deleteVendorAction(vendor.id)
      if (result.success) onDeleted(vendor.id)
    })
  }

  if (isEditing) {
    return (
      <Card className="border-indigo-200">
        <CardContent className="p-5">
          <p className="mb-4 text-sm font-semibold text-slate-800">Edit Vendor</p>
          <VendorForm
            mode="edit"
            vendorId={vendor.id}
            initialData={vendor}
            onSuccess={(updated) => {
              onUpdated(updated)
              setIsEditing(false)
            }}
            onCancel={() => setIsEditing(false)}
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              This vendor will be removed from your directory and unassigned from
              any events.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDeleteDialog(false)
                executeDelete()
              }}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card
        className={`border-slate-200 transition-opacity ${deletePending ? 'opacity-50' : ''}`}
      >
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{vendor.name}</p>
              <Badge className={`mt-1 text-xs ${categoryBadgeClass(vendor.category)}`}>
                {vendor.category}
              </Badge>
            </div>
            <div className="flex shrink-0 gap-0.5">
              <button
                onClick={() => setIsEditing(true)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                title="Edit vendor"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                title="Delete vendor"
                disabled={deletePending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            {vendor.email && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{vendor.email}</span>
              </div>
            )}
            {vendor.phone && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>{vendor.phone}</span>
              </div>
            )}
            {vendor.location && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span>{vendor.location}</span>
              </div>
            )}
            {vendor.notes && (
              <p className="line-clamp-2 text-sm text-slate-500">{vendor.notes}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

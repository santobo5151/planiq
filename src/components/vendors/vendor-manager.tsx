'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { VendorCard } from '@/components/vendors/vendor-card'
import { VendorForm } from '@/components/vendors/vendor-form'
import type { Vendor } from '@/types/database'

interface Props {
  initialVendors: Vendor[]
}

export function VendorManager({ initialVendors }: Props) {
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors)
  const [showAddForm, setShowAddForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')

  const categories = useMemo(
    () => Array.from(new Set(vendors.map((v) => v.category))).sort(),
    [vendors]
  )

  useEffect(() => {
    if (filterCategory !== 'all' && !categories.includes(filterCategory)) {
      setFilterCategory('all')
    }
  }, [categories, filterCategory])

  const filtered = useMemo(() => {
    let result = vendors
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q)
      )
    }
    if (filterCategory !== 'all') {
      result = result.filter((v) => v.category === filterCategory)
    }
    return result
  }, [vendors, search, filterCategory])

  function handleAdded(vendor: Vendor) {
    setVendors((vs) =>
      [...vs, vendor].sort((a, b) => a.name.localeCompare(b.name))
    )
    setShowAddForm(false)
  }

  function handleUpdated(updated: Vendor) {
    setVendors((vs) =>
      vs
        .map((v) => (v.id === updated.id ? updated : v))
        .sort((a, b) => a.name.localeCompare(b.name))
    )
  }

  function handleDeleted(id: string) {
    setVendors((vs) => vs.filter((v) => v.id !== id))
  }

  return (
    <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            My Vendors
          </h1>
          {!showAddForm && (
            <Button
              onClick={() => setShowAddForm(true)}
              className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Add Vendor
            </Button>
          )}
        </div>

        {/* Add form */}
        {showAddForm && (
          <Card className="mt-6 border-indigo-200">
            <CardContent className="p-6">
              <p className="mb-4 text-base font-semibold text-slate-900">
                Add Vendor
              </p>
              <VendorForm
                mode="add"
                onSuccess={handleAdded}
                onCancel={() => setShowAddForm(false)}
              />
            </CardContent>
          </Card>
        )}

        {/* Search + category filter */}
        <div className="mt-6 space-y-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendors by name or category…"
            className="max-w-sm"
          />
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterCategory('all')}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  filterCategory === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-indigo-50'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    filterCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-indigo-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {vendors.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-center">
            <p className="text-base font-medium text-slate-900">
              No vendors yet.
            </p>
            <p className="text-sm text-slate-500">
              Add your first vendor to get started.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="mt-16 text-center text-sm text-slate-500">
            No vendors match your search.
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        )}
    </div>
  )
}

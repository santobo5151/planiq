'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function LogoutButton({ redirectTo = '/login' }: { redirectTo?: string }) {
  const [loading, setLoading] = useState(false)

  async function onLogout() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = redirectTo
  }

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onLogout}
      disabled={loading}
      className="w-full justify-start gap-2 text-slate-700 hover:text-indigo-600"
    >
      <LogOut className="h-4 w-4" />
      {loading ? 'Signing out…' : 'Log out'}
    </Button>
  )
}

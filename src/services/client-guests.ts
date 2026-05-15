import 'server-only'
import { createClient } from '@/lib/supabase/server'

export interface ClientGuestSummary {
  total: number
  attending: number
  declined: number
  pending: number
}

export async function getClientGuestSummary(
  eventId: string
): Promise<ClientGuestSummary | null> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('guests')
      .select('rsvp_status')
      .eq('event_id', eventId)

    if (error || !data || data.length === 0) return null

    const rows = data as Array<{ rsvp_status: string }>

    let attending = 0
    let declined = 0
    let pending = 0

    for (const row of rows) {
      if (row.rsvp_status === 'attending') attending++
      else if (row.rsvp_status === 'declined') declined++
      else pending++
    }

    return { total: rows.length, attending, declined, pending }
  } catch {
    return null
  }
}

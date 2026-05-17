export type UserRole = 'planner' | 'client' | 'vendor'
export type EventStatus = 'draft' | 'active' | 'completed'
export type BudgetStatus = 'pending' | 'confirmed' | 'paid'
export type ChecklistStatus = 'todo' | 'in_progress' | 'done'
export type RsvpStatus = 'pending' | 'attending' | 'declined'
export type GuestRsvpStatus = 'pending' | 'attending' | 'declined'

export interface Profile {
  id: string
  role: UserRole | null
  full_name: string | null
  avatar_url: string | null
  organization_id: string | null
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  owner_id: string
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  created_by: string
  planner_id: string | null
  client_id: string | null
  organization_id: string | null
  title: string
  event_type: string | null
  location: string | null
  event_date: string | null
  guest_count: number | null
  budget_ceiling: number | null
  theme: string | null
  food_preferences: string | null
  rsvp_deadline: string | null
  status: EventStatus
  created_at: string
  updated_at: string
}

export interface EventPlan {
  id: string
  event_id: string
  concept_summary: string | null
  timeline: unknown | null
  vendor_categories: unknown | null
  recommendations: unknown | null
  model_used: string | null
  prompt_version: string | null
  generated_at: string
}

export interface Budget {
  id: string
  event_id: string
  category: string
  description: string | null
  estimated_amount: number | null
  actual_amount: number | null
  notes: string | null
  status: BudgetStatus
  ai_generated: boolean
  created_at: string
  updated_at: string
}

export interface Checklist {
  id: string
  event_id: string
  title: string
  due_date: string | null
  category: string | null
  notes: string | null
  status: ChecklistStatus
  ai_generated: boolean
  created_at: string
}

export type VendorStatus = 'invited' | 'confirmed' | 'declined'

export interface Vendor {
  id: string
  planner_id: string
  name: string
  category: string
  email: string | null
  phone: string | null
  location: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface EventVendor {
  id: string
  event_id: string
  vendor_id: string
  status: VendorStatus
  notes: string | null
  invite_token: string | null
  vendor_user_id: string | null
  responded_at: string | null
  created_at: string
  updated_at: string
  vendor?: Vendor
}

export interface Invite {
  id: string
  event_id: string
  email: string
  token: string
  accepted_at: string | null
  client_user_id: string | null
  created_at: string
}

export interface Guest {
  id: string
  event_id: string
  first_name: string
  last_name: string
  email: string | null
  rsvp_status: GuestRsvpStatus
  dietary_notes: string | null
  plus_one: boolean
  plus_one_allowed: boolean
  rsvp_token: string | null
  rsvp_responded_at: string | null
  rsvp_sent_at: string | null
  created_at: string
}

export interface PublicRsvpGuest {
  first_name: string
  last_name: string
  rsvp_status: GuestRsvpStatus
  plus_one: boolean
  plus_one_allowed: boolean
  dietary_notes: string | null
  rsvp_responded_at: string | null
}

export interface VendorInviteContext {
  event: {
    id: string
    title: string
    event_type: string | null
    location: string | null
    event_date: string | null
  }
  category: string
  plannerNote: string | null
  plannerName: string | null
  inviteEmail: string
  alreadyAccepted: boolean
}

export interface VendorUser {
  id: string
  business_name: string | null
  contact_name: string | null
  category: string | null
  phone: string | null
  location: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

// Minimal projection of event fields a vendor is allowed to see.
// Vendors must NEVER receive budget_ceiling, theme, food_preferences,
// guest_count, client_id, planner_id, created_by, or organization_id.
// This type enforces that boundary at the type level — services that
// build VendorEventSummary objects must explicitly select only the
// listed columns.
export type VendorEventSummary = {
  id: string
  title: string
  event_type: string | null
  location: string | null
  event_date: string | null
}

// One row in the vendor dashboard list.
// event_vendors fields the vendor is allowed to see + minimal event data
// + the vendor-directory category (the planner-chosen vendor category for
// this specific assignment, distinct from the vendor's own self-declared
// category in vendor_users).
//
// vendor_directory_category may be null if RLS filters the nested join
// to the `vendors` table. UI components must render gracefully when null.
export type VendorAssignmentListItem = {
  event_vendor_id: string
  status: 'invited' | 'confirmed' | 'declined'
  notes: string | null
  responded_at: string | null
  created_at: string
  vendor_directory_category: string | null
  event: VendorEventSummary
}

// Detail shape returned by getVendorAssignmentDetail for the per-event view.
// Looked up by eventId (NOT event_vendor_id) because the per-event route is
// /vendor/event/[eventId]. Same minimal event projection, plus the planner's
// note (event_vendors.notes), planner_name, and current status.
//
// vendor_directory_category may be null — see note on VendorAssignmentListItem.
// planner_name may be null if the profiles RLS lookup returns no row.
export type VendorAssignmentDetail = {
  event_vendor_id: string
  status: 'invited' | 'confirmed' | 'declined'
  planner_note: string | null
  planner_name: string | null
  responded_at: string | null
  created_at: string
  vendor_directory_category: string | null
  event: VendorEventSummary
}

export interface CreateEventInput {
  title: string
  event_type?: string
  location?: string
  event_date?: string
  guest_count?: number | null
  budget_ceiling?: number | null
  theme?: string
  food_preferences?: string
}

export type {
  GeneratedPlan,
  GeneratedBudget,
  GeneratedChecklist,
} from '@/lib/ai/schemas'

export type UserRole = 'planner' | 'client'
export type EventStatus = 'draft' | 'active' | 'completed'
export type BudgetStatus = 'pending' | 'confirmed' | 'paid'
export type ChecklistStatus = 'todo' | 'in_progress' | 'done'
export type RsvpStatus = 'pending' | 'attending' | 'declined'

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
  status: ChecklistStatus
  ai_generated: boolean
  created_at: string
}

export interface Invite {
  id: string
  event_id: string
  email: string
  token: string
  accepted_at: string | null
  created_at: string
}

export interface Guest {
  id: string
  event_id: string
  name: string
  email: string | null
  rsvp_status: RsvpStatus
  dietary_notes: string | null
  plus_one: boolean
  created_at: string
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

export type { GeneratedPlan } from '@/lib/ai/schemas'

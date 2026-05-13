import { z } from 'zod'

export const GeneratedPlanSchema = z.object({
  concept_summary: z.string(),
  timeline: z.array(
    z.object({
      time: z.string(),
      activity: z.string(),
      notes: z.string(),
    })
  ),
  vendor_categories: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      priority: z.enum(['essential', 'recommended', 'optional']),
      estimated_cost: z.string(),
    })
  ),
  recommendations: z.array(
    z.object({
      category: z.string(),
      suggestion: z.string(),
      reason: z.string(),
    })
  ),
})

export type GeneratedPlan = z.infer<typeof GeneratedPlanSchema>

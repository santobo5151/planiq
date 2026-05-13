import 'server-only'
import type Anthropic from '@anthropic-ai/sdk'
import { anthropic, ANTHROPIC_MODEL } from '@/lib/ai/anthropic'
import { GeneratedPlanSchema, type GeneratedPlan } from '@/lib/ai/schemas'
import type { Event as PlanIQEvent } from '@/types/database'

const TOOL_NAME = 'submit_event_plan'

const TOOL_INPUT_SCHEMA: Anthropic.Messages.Tool.InputSchema = {
  type: 'object',
  properties: {
    concept_summary: {
      type: 'string',
      description:
        'A 2-3 sentence vision capturing the feel and intent of the event.',
    },
    timeline: {
      type: 'array',
      description: '6-12 chronological items describing the event flow.',
      items: {
        type: 'object',
        properties: {
          time: {
            type: 'string',
            description: 'A time stamp like "17:00" or "9:30 AM".',
          },
          activity: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['time', 'activity', 'notes'],
      },
    },
    vendor_categories: {
      type: 'array',
      description: '5-10 vendor categories needed for this event.',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          priority: {
            type: 'string',
            enum: ['essential', 'recommended', 'optional'],
          },
          estimated_cost: {
            type: 'string',
            description:
              'A cost range in the detected local currency (£ for UK/default, ₦ for Nigeria), e.g. "£2,000-£3,500" or "₦2,000,000-₦3,500,000".',
          },
        },
        required: ['name', 'description', 'priority', 'estimated_cost'],
      },
    },
    recommendations: {
      type: 'array',
      description: '3-5 actionable, event-specific recommendations.',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          suggestion: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['category', 'suggestion', 'reason'],
      },
    },
  },
  required: [
    'concept_summary',
    'timeline',
    'vendor_categories',
    'recommendations',
  ],
}

function buildPrompt(event: PlanIQEvent): string {
  const fields: Array<[string, string | number | null | undefined]> = [
    ['Title', event.title],
    ['Type', event.event_type],
    ['Date', event.event_date],
    ['Location', event.location],
    ['Guest count', event.guest_count],
    [
      'Budget ceiling (numeric — interpret per detected locale)',
      event.budget_ceiling != null
        ? event.budget_ceiling.toLocaleString('en-GB')
        : null,
    ],
    ['Theme', event.theme],
    ['Food preferences', event.food_preferences],
  ]

  const fieldsBlock = fields
    .map(
      ([label, value]) =>
        `- ${label}: ${
          value === null || value === undefined || value === ''
            ? 'Not specified'
            : value
        }`
    )
    .join('\n')

  return [
    'You are an experienced event planner who serves both UK and Nigerian markets. Produce a realistic, specific plan for the event below.',
    '',
    'Event details:',
    fieldsBlock,
    '',
    'Step 1 — Locale detection (from the Location field):',
    '- Treat the event as Nigerian if Location mentions any of: Nigeria, Lagos, Abuja, Port Harcourt, Kano, Ibadan, Benin City, Kaduna, Enugu, Warri, Calabar, Jos, Ilorin, Owerri, Uyo, Abeokuta, Lekki, Victoria Island, VI, Ikoyi, Surulere, Ikeja, Mainland, Abuja FCT, Lekki Phase 1, NG, Naija, or any well-known Nigerian venue, area, or landmark.',
    '- Treat the event as UK if Location mentions any of: UK, United Kingdom, England, Scotland, Wales, London, Manchester, Birmingham, Leeds, Liverpool, Sheffield, Bristol, Cardiff, Edinburgh, Glasgow, Newcastle, Brighton, Oxford, Cambridge, Bath, York, Essex, Kent, Surrey, or any well-known UK venue or area.',
    '- If the Location is ambiguous, missing, or unrecognised, default to GBP and a neutral international tone.',
    '',
    'Step 2 — Currency:',
    '- Nigerian event → use Nigerian Naira (₦) for every cost estimate, including each vendor_categories.estimated_cost.',
    '- UK event → use GBP (£) for every cost estimate.',
    '- Default → GBP (£).',
    '- Interpret the Budget ceiling number in the detected local currency. For example, 5,000,000 for a Lagos event means ₦5,000,000; 10,000 for a London event means £10,000. Scale recommendations to the budget so interpreted.',
    '',
    'Step 3 — Cultural context (apply respectfully and only when relevant to the event type):',
    '',
    'If Nigerian:',
    '- Weddings: distinguish traditional wedding / introduction ceremony, white wedding (church or mosque ceremony), reception, and after-party. Each may need separate planning, vendor coordination, and logistics.',
    '- Social celebrations (birthdays, galas, private parties, owambe): include aso-ebi fabric coordination; Nigerian cuisine (jollof rice, pepper soup, pounded yam, small chops, assorted meats, zobo, chapman); entertainment (MC/hype man, afrobeats and highlife DJ, live band); Nigerian decor styles (ankara fabric, floral arches, luxury centrepieces); photography and videography with drone coverage.',
    '- Corporate events: professional Nigerian event management, AV setup, branded decor, and formal catering appropriate to a business setting.',
    '- Include church, mosque, traditional ceremony, reception, and after-party logistics where relevant to the event type.',
    '- Include realistic timing buffers and arrival flexibility where culturally appropriate.',
    '- Vendor categories should reflect the Nigerian market: event decorator, Nigerian caterer, event MC, aso-ebi coordinator (for weddings and social events), photography & videography, event centre or hotel ballroom venue.',
    '',
    'If UK:',
    '- Weddings: distinguish civil ceremony, church ceremony, registry office, reception, and evening party. Coordinate logistics between ceremony and reception venues where applicable.',
    '- Social events: venue types include manor houses, city hotels, rooftop venues, country estates, hired halls, and boutique venues.',
    '- Catering options: formal sit-down dinners, canapé receptions, afternoon teas, and buffet options.',
    '- Entertainment: live bands, string quartets, DJs, toastmasters, and photo booths.',
    '- Supplier norms: many UK vendors require contracts and deposits well in advance, especially for peak dates.',
    '- Use professional UK event planning terminology throughout.',
    '',
    'Step 4 — Vendor discovery: include at least one recommendation guiding the planner on where to find local vendors. Use platform names only; do not include URLs:',
    '- Nigerian events: Google, Instagram, BellaNaija Weddings, LoveweddingsNG, and Pelbliss for vendor discovery and inspiration across Lagos, Abuja, Port Harcourt, and other cities.',
    '- UK events: Google, Hitched, Bridebook, and Bark for UK supplier discovery and comparison.',
    '',
    'Required output (structure unchanged):',
    '1. concept_summary — 2-3 sentence vision capturing the feel and intent.',
    '2. timeline — 6-12 chronological items: time, activity, notes.',
    '3. vendor_categories — 5-10 categories needed for this event. For each: name, description, priority (essential | recommended | optional), and estimated_cost as a range in the detected currency, e.g. "£2,000-£3,500" or "₦2,000,000-₦3,500,000".',
    '4. recommendations — 3-5 tailored suggestions: category, suggestion, reason. At least one must address vendor discovery per Step 4.',
    '',
    `If a field is "Not specified", make a reasonable assumption and note it in the relevant field. Submit your result with the ${TOOL_NAME} tool.`,
  ].join('\n')
}

function extractJsonObject(text: string): string | null {
  let depth = 0
  let start = -1
  let inString = false
  let escape = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\') {
      escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '{') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        return text.slice(start, i + 1)
      }
    }
  }
  return null
}

export async function generateEventPlan(
  event: PlanIQEvent
): Promise<GeneratedPlan> {
  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    tools: [
      {
        name: TOOL_NAME,
        description: 'Submit the structured event plan back to the application.',
        input_schema: TOOL_INPUT_SCHEMA,
      },
    ],
    tool_choice: { type: 'tool', name: TOOL_NAME },
    messages: [{ role: 'user', content: buildPrompt(event) }],
  })

  let rawInput: unknown

  const toolUse = response.content.find((c) => c.type === 'tool_use')
  if (toolUse && toolUse.type === 'tool_use') {
    rawInput = toolUse.input
  } else {
    const textBlock = response.content.find((c) => c.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('AI response contained no tool use or text content.')
    }
    const text = textBlock.text
    try {
      rawInput = JSON.parse(text)
    } catch {
      const extracted = extractJsonObject(text)
      if (!extracted) {
        throw new Error('Could not locate a JSON object in the AI response.')
      }
      try {
        rawInput = JSON.parse(extracted)
      } catch (e) {
        throw new Error(
          `Extracted JSON did not parse: ${
            e instanceof Error ? e.message : 'unknown error'
          }`
        )
      }
    }
  }

  const parsed = GeneratedPlanSchema.safeParse(rawInput)
  if (!parsed.success) {
    throw new Error(
      `AI response failed schema validation: ${parsed.error.message}`
    )
  }
  return parsed.data
}

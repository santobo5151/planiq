import Link from 'next/link'
import { Users, Sparkles, Wallet, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MarketingHeaderV2 } from '@/components/marketing/v2/MarketingHeaderV2'
import { MarketingFooterV2 } from '@/components/marketing/v2/MarketingFooterV2'

export const metadata = {
  title: 'PlanIQ: Plan events with confidence',
  description:
    'PlanIQ helps professional planners and self-planners turn event ideas into plans, budgets, checklists, guests, vendors, and client collaboration. Built for the African events market.',
}

function HeroSection() {
  return (
    <section id="hero" className="relative overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,rgba(255,255,255,0)_22%,rgba(255,255,255,0)_75%,#ffffff_100%),radial-gradient(ellipse_70%_60%_at_50%_-20%,#ffffff_0%,rgba(255,255,255,0)_80%),linear-gradient(90deg,#a5b4fc_0%,#c7d2fe_15%,#ffffff_40%,#ffffff_60%,#c7d2fe_85%,#a5b4fc_100%)] pt-10 pb-20 sm:pt-14 sm:pb-28 lg:pt-16 lg:pb-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">

          {/* Left column: copy */}
          <div className="text-center lg:text-left">
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl leading-[1.05]">
              Plan every event with{' '}
              <em className="italic text-indigo-600">confidence</em>, not chaos
            </h1>
            <p className="mt-6 text-lg sm:text-xl leading-relaxed text-slate-600 lg:max-w-xl">
              PlanIQ turns an event brief into a plan, budget, checklist, and guest list in minutes, then keeps your clients and vendors in sync so you stay in control instead of buried in spreadsheets.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row justify-center lg:justify-start">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-7 py-3.5 text-base font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors"
              >
                Get started
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-7 py-3.5 text-base font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
              >
                See how it works
              </Link>
            </div>
          </div>

          {/* Right column: 2-fragment cluster */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none lg:h-[420px]">

            {/* Fragment B (satellite): guest-list mini-card (left/back, lg only) */}
            <div className="absolute left-0 top-8 hidden w-72 -rotate-3 lg:block z-10">
              <div className="rounded-xl bg-white p-4 shadow-xl ring-1 ring-slate-900/5">
                <div className="mb-3 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  <span className="text-xs font-medium text-slate-500">Guests</span>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <span aria-hidden="true" className="h-7 w-7 shrink-0 rounded-full bg-indigo-200" />
                    <span className="flex-1 text-sm text-slate-800">Olivia</span>
                    <Badge variant="success" className="text-xs">Attending</Badge>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span aria-hidden="true" className="h-7 w-7 shrink-0 rounded-full bg-amber-200" />
                    <span className="flex-1 text-sm text-slate-800">Arun</span>
                    <Badge variant="warning" className="text-xs">Pending</Badge>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span aria-hidden="true" className="h-7 w-7 shrink-0 rounded-full bg-slate-200" />
                    <span className="flex-1 text-sm text-slate-800">Jay</span>
                    <Badge variant="success" className="text-xs">Attending</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Fragment A (anchor): event plan card (front, right) */}
            <div className="relative z-20 ml-auto max-w-md">
              <div className="rounded-xl bg-white p-5 shadow-xl ring-1 ring-slate-900/5">
                {/* Indigo header band */}
                <div className="bg-indigo-50 -mx-5 -mt-5 px-5 py-3 mb-4 rounded-t-xl">
                  <p className="font-semibold text-slate-900">Summer Gala</p>
                  <p className="text-sm text-slate-500">24 Aug 2026 · 120 guests</p>
                </div>
                {/* Mini-summary row */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    Plan generated
                  </span>
                  <Badge variant="success" className="text-xs">Budget on track</Badge>
                </div>
                {/* Divider */}
                <div className="border-t border-slate-100 mb-3" />
                {/* Progress rows */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">Venue booked</span>
                    <Badge variant="success">Done</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-700">Catering</span>
                    <Badge variant="warning">In progress</Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-700">Budget</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">₦18.2m / ₦25m</span>
                      <Badge variant="success">On track</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}

function FeaturesSection() {
  return (
    <section id="features" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">

        {/* Heading block */}
        <div className="mb-12 text-center sm:mb-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Everything in one place</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">From first brief to final guest, handled</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg leading-relaxed text-slate-600">PlanIQ brings the whole event together: the plan, the money, the people. Nothing slips through the cracks.</p>
        </div>

        {/* 1×4 row (2×2 tablet, 1 col mobile) */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:auto-rows-fr lg:grid-cols-4">

          {/* Block 1: PLAN (indigo-600 punch block) */}
          <div className="flex h-full flex-col rounded-2xl bg-indigo-600 p-6 shadow-sm ring-1 ring-indigo-500/20">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <Sparkles className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <p className="text-lg font-semibold uppercase tracking-wide text-white">Plan</p>
            </div>
            <h3 className="mt-4 text-base font-semibold text-white">From brief to a working plan</h3>
            <p className="mt-2 text-sm leading-6 text-indigo-50">PlanIQ generates an event concept, structure, and timeline tailored to your event type, location, and goals. Edit anything that doesn&apos;t fit. The plan stays yours.</p>
          </div>

          {/* Block 2: BUDGET (cream) */}
          <div className="flex h-full flex-col rounded-2xl bg-surface-cream p-6 shadow-sm ring-1 ring-slate-900/5">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/70 ring-1 ring-slate-900/5">
                <Wallet className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              </div>
              <p className="text-lg font-semibold uppercase tracking-wide text-indigo-600">Budget</p>
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">Estimate, track, and adjust spend by category</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">See where the money is going. Edit AI-generated budgets to match your reality. PlanIQ keeps the totals honest.</p>
          </div>

          {/* Block 3: COORDINATE (cream) */}
          <div className="flex h-full flex-col rounded-2xl bg-surface-cream p-6 shadow-sm ring-1 ring-slate-900/5">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/70 ring-1 ring-slate-900/5">
                <Users className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              </div>
              <p className="text-lg font-semibold uppercase tracking-wide text-indigo-600">Coordinate</p>
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">Guests, vendors, and RSVPs in one place</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Send invite emails, track responses, and keep everyone moving forward. Status badges show at a glance who&apos;s confirmed and who&apos;s still pending.</p>
          </div>

          {/* Block 4: COLLABORATE (lilac) */}
          <div className="flex h-full flex-col rounded-2xl bg-surface-lilac p-6 shadow-sm ring-1 ring-slate-900/5">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white/70 ring-1 ring-slate-900/5">
                <MessageSquare className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              </div>
              <p className="text-lg font-semibold uppercase tracking-wide text-indigo-600">Collaborate</p>
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">Clients in the loop, feedback in context</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">Invite your client. Share vendor bookings. Comments anchor to the plan, budget, or checklist, so feedback is structured, not buried in email.</p>
          </div>

        </div>

      </div>
    </section>
  )
}

function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      title: 'Tell PlanIQ about your event',
      body: 'Share the basics: event type, date, location, budget, and theme. It takes a couple of minutes.',
    },
    {
      num: '02',
      title: 'AI builds your plan, budget, and checklist',
      body: "PlanIQ generates a tailored plan, an editable budget by category, and a working checklist. You stay in control and can adjust anything that doesn't fit.",
    },
    {
      num: '03',
      title: 'Invite collaborators and run the event',
      body: 'Bring your client in to follow along, send vendor bookings, and invite guests to RSVP. Track everything from one dashboard, right through to the day.',
    },
  ]

  return (
    <section id="how-it-works" className="bg-[linear-gradient(180deg,#ffffff_0%,hsl(232,100%,96%)_12%)] py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center sm:mb-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">How it works</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            From brief to event day in three steps
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.num}
              className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5"
            >
              <span className="font-serif text-4xl font-semibold text-indigo-600">{step.num}</span>
              <h3 className="mt-4 text-base font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FaqSection() {
  const faqs = [
    {
      q: 'Who is PlanIQ for?',
      a: 'PlanIQ is built for two audiences: professional event planners managing events for clients, and self-planners organising their own wedding, birthday, or corporate event. Both get the full planner experience.',
    },
    {
      q: 'Does PlanIQ work for my type of event?',
      a: 'PlanIQ supports weddings, birthdays, and corporate events. The AI adapts the generated plan, budget, and checklist to the event type you choose.',
    },
    {
      q: 'Do my clients and vendors need PlanIQ accounts?',
      a: "Clients and vendors don't sign up from the public signup page. You invite them, and they receive a secure magic-link email that gives them access to the right event view.",
    },
    {
      q: 'Which markets does PlanIQ support?',
      a: "PlanIQ is built for the African events market. We're starting in Nigeria and currently support Nigerian and UK event workflows, with more countries rolling out. Budgets show in the local currency based on the event location.",
    },
    {
      q: 'Is my event data private?',
      a: 'Each event starts private to the planner who created it. Clients, vendors, and guests only see the parts you choose to share through invites, bookings, RSVP links, or comments. Guest details and detailed budget line items are never shown in public RSVP or vendor views.',
    },
  ]

  return (
    <section id="faq" className="bg-[linear-gradient(180deg,hsl(232,100%,96%)_0%,#ffffff_12%)] py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center font-serif text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
          Frequently asked questions
        </h2>
        <div className="mt-12 space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.q}
              className="group rounded-xl border border-slate-200 bg-white p-6 transition-colors open:bg-surface-cream"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-slate-900">
                <span>{faq.q}</span>
                <span aria-hidden="true" className="ml-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180">▾</span>
              </summary>
              <p className="mt-4 leading-relaxed text-slate-600">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCtaSection() {
  return (
    <section id="cta" className="bg-indigo-600 py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-serif text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Plan your next event with confidence
        </h2>
        <p className="mt-4 text-lg text-indigo-100">
          Create your PlanIQ account and start your first event in minutes.
        </p>
        <div className="mt-8">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-base font-medium text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50"
          >
            Get started
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <MarketingHeaderV2 />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <MarketingFooterV2 />
    </>
  )
}

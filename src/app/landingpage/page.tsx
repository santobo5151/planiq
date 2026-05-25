import Link from 'next/link'
import { cn } from '@/lib/utils'
import { MarketingHeader } from '@/components/marketing/MarketingHeader'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'
import { BrowserFrame } from '@/components/marketing/BrowserFrame'

export const metadata = {
  title: 'PlanIQ — Plan smarter events from brief to execution',
  description:
    'PlanIQ helps professional planners and self-planners turn event ideas into plans, budgets, checklists, guests, vendors, and client collaboration. Built for UK and Nigerian event workflows.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function Home() {
  return (
    <>
      <MarketingHeader />
      <main>
        <HeroSection />
        <TrustBand />
        <FeaturesSection />
        <HowItWorksSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <MarketingFooter />
    </>
  )
}

type FeatureRowProps = {
  label: string
  heading: string
  body: string
  screenshot: {
    src: string
    alt: string
    urlLabel: string
    width: number
    height: number
  }
  reverse?: boolean
}

function FeatureRow({ label, heading, body, screenshot, reverse = false }: FeatureRowProps) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
      <div className={cn("space-y-5", reverse && "lg:order-2")}>
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
          {label}
        </p>
        <h3 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {heading}
        </h3>
        <p className="text-lg leading-relaxed text-slate-600">
          {body}
        </p>
      </div>
      <div className={cn(reverse && "lg:order-1")}>
        <BrowserFrame {...screenshot} />
      </div>
    </div>
  )
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/60 via-white to-white py-20 sm:py-28 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl lg:leading-[1.05]">
            Plan smarter events from brief to execution
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl sm:leading-relaxed">
            PlanIQ helps professional planners and self-planners turn event ideas into plans,
            budgets, checklists, guests, vendors, and client collaboration — built with UK and
            Nigerian event workflows in mind.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-7 py-3.5 text-base font-medium text-white shadow-sm hover:bg-indigo-700 hover:shadow-md transition-all"
            >
              Get started
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-7 py-3.5 text-base font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors"
            >
              See how it works
            </Link>
          </div>
        </div>
        <div className="mt-16 sm:mt-20 mx-auto max-w-6xl">
          <BrowserFrame
            src="/screenshots/landing/01-event-detail.png"
            alt="PlanIQ event detail page showing the event title, date, location, status, and quick navigation to plan, budget, and guests"
            urlLabel="planiq.app/events/tides-birthday"
            width={2182}
            height={1328}
            priority
          />
        </div>
      </div>
    </section>
  )
}

function TrustBand() {
  return (
    <section className="border-y border-slate-200 bg-slate-100/70 py-10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-base sm:text-lg text-slate-700">
          Built for planners and self-planners managing real event complexity across the UK and Nigeria.
        </p>
      </div>
    </section>
  )
}

function FeaturesSection() {
  return (
    <section className="bg-indigo-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Everything event planning actually needs
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Four pillars that cover the full event lifecycle — from the first idea to the day-of execution.
          </p>
        </div>
        <div className="mt-20 space-y-24 sm:space-y-32">
          <FeatureRow
            label="Pillar 01 — Plan"
            heading="Turn an event brief into a working plan"
            body="PlanIQ generates an event concept, structure, and timeline tailored to your event type, location, and goals. Edit anything that doesn't fit. The plan stays yours."
            screenshot={{
              src: "/screenshots/landing/02-ai-plan.png",
              alt: "PlanIQ AI-generated event plan showing structured sections for the event concept, timeline, and recommendations",
              urlLabel: "planiq.app/events/tides-birthday/plan",
              width: 2176,
              height: 1406,
            }}
          />
          <FeatureRow
            reverse
            label="Pillar 02 — Budget"
            heading="Estimate, track, and adjust spend by category"
            body="See where the money is going in pounds or naira. Edit AI-generated budgets to match your reality. PlanIQ keeps the totals honest."
            screenshot={{
              src: "/screenshots/landing/03-budget.png",
              alt: "PlanIQ budget page with category-level spend breakdown in Nigerian Naira, including progress bars and category totals",
              urlLabel: "planiq.app/events/tides-birthday/budget",
              width: 2324,
              height: 1376,
            }}
          />
          <FeatureRow
            label="Pillar 03 — Coordinate"
            heading="Checklists, guests, vendors, and RSVPs in one place"
            body="Send invite emails, track responses, and keep everyone moving forward. Status badges show at a glance who's confirmed and who's still pending."
            screenshot={{
              src: "/screenshots/landing/04-guests.png",
              alt: "PlanIQ guests page showing the guest list with first and last names, email addresses, RSVP status badges, and plus-one toggles",
              urlLabel: "planiq.app/events/tides-birthday/guests",
              width: 2344,
              height: 1556,
            }}
          />
          <FeatureRow
            reverse
            label="Pillar 04 — Collaborate"
            heading="Share read-only views with clients, capture feedback as comments"
            body="Invite your client. Send vendor bookings. Comments anchor to the plan, budget, or checklist — so feedback is structured, not buried in email."
            screenshot={{
              src: "/screenshots/landing/05-comments.png",
              alt: "PlanIQ comments page showing structured feedback threads anchored to plan, budget, and checklist surfaces",
              urlLabel: "planiq.app/events/tides-birthday/comments",
              width: 1994,
              height: 1312,
            }}
          />
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-slate-100/70 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            How PlanIQ works
          </h2>
        </div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="relative">
            <div className="text-sm font-semibold text-indigo-600">Step 01</div>
            <h3 className="mt-3 text-xl font-semibold text-slate-900">
              Tell PlanIQ about your event
            </h3>
            <p className="mt-3 leading-relaxed text-slate-600">
              Share the basics: event type, date, location, budget ceiling, and theme. It takes a couple of minutes.
            </p>
          </div>
          <div className="relative">
            <div className="text-sm font-semibold text-indigo-600">Step 02</div>
            <h3 className="mt-3 text-xl font-semibold text-slate-900">
              AI builds your plan, budget, and checklist
            </h3>
            <p className="mt-3 leading-relaxed text-slate-600">
              PlanIQ generates a tailored event plan, an editable budget by category, and a working checklist. You stay in control — adjust anything that doesn&apos;t fit.
            </p>
          </div>
          <div className="relative">
            <div className="text-sm font-semibold text-indigo-600">Step 03</div>
            <h3 className="mt-3 text-xl font-semibold text-slate-900">
              Invite collaborators and run the event
            </h3>
            <p className="mt-3 leading-relaxed text-slate-600">
              Invite your client to follow along. Send vendor bookings. Send RSVP invites to guests. Track everything from one dashboard until the event happens.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function FaqSection() {
  return (
    <section className="bg-indigo-50 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl text-center">
          Frequently asked questions
        </h2>
        <div className="mt-12 space-y-3">
          <details className="group rounded-xl border border-slate-200 bg-white p-6 transition-colors open:bg-slate-50">
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium text-slate-900 list-none">
              <span>Who is PlanIQ for?</span>
              <span className="ml-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180">▾</span>
            </summary>
            <p className="mt-4 leading-relaxed text-slate-600">
              PlanIQ is built for two audiences: professional event planners managing events for clients, and self-planners organising their own wedding, birthday, or corporate event. Both get the full planner experience.
            </p>
          </details>
          <details className="group rounded-xl border border-slate-200 bg-white p-6 transition-colors open:bg-slate-50">
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium text-slate-900 list-none">
              <span>Does PlanIQ work for my type of event?</span>
              <span className="ml-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180">▾</span>
            </summary>
            <p className="mt-4 leading-relaxed text-slate-600">
              PlanIQ supports weddings, birthdays, and corporate events. The AI adapts the generated plan, budget, and checklist to the event type you choose.
            </p>
          </details>
          <details className="group rounded-xl border border-slate-200 bg-white p-6 transition-colors open:bg-slate-50">
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium text-slate-900 list-none">
              <span>Do my clients and vendors need PlanIQ accounts?</span>
              <span className="ml-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180">▾</span>
            </summary>
            <p className="mt-4 leading-relaxed text-slate-600">
              Clients and vendors do not sign up from the public signup page. You invite them, and they receive a secure magic-link email that gives them access to the right event view.
            </p>
          </details>
          <details className="group rounded-xl border border-slate-200 bg-white p-6 transition-colors open:bg-slate-50">
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium text-slate-900 list-none">
              <span>Which markets does PlanIQ support?</span>
              <span className="ml-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180">▾</span>
            </summary>
            <p className="mt-4 leading-relaxed text-slate-600">
              PlanIQ is built for UK and Nigerian event workflows today. Budgets show in pounds or naira based on the event location, and the product is designed around the planning patterns common in those markets.
            </p>
          </details>
          <details className="group rounded-xl border border-slate-200 bg-white p-6 transition-colors open:bg-slate-50">
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium text-slate-900 list-none">
              <span>Is my event data private?</span>
              <span className="ml-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180">▾</span>
            </summary>
            <p className="mt-4 leading-relaxed text-slate-600">
              Each event starts private to the planner who created it. Clients, vendors, and guests only see the parts you choose to share with them through invites, bookings, RSVP links, or comments. Guest details and detailed budget line items are not shown in public RSVP or vendor views.
            </p>
          </details>
        </div>
      </div>
    </section>
  )
}

function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 py-20 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Ready to plan smarter?
        </h2>
        <p className="mt-4 text-lg text-indigo-100">
          Create your PlanIQ account and start your first event in minutes.
        </p>
        <div className="mt-8">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-lg bg-white px-7 py-3.5 text-base font-medium text-indigo-600 shadow-sm hover:bg-indigo-50 hover:shadow-md transition-all"
          >
            Get started
          </Link>
        </div>
      </div>
    </section>
  )
}

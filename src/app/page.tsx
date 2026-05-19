import Link from 'next/link'
import { MarketingHeader } from '@/components/marketing/MarketingHeader'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'

export const metadata = {
  title: 'PlanIQ — Plan smarter events from brief to execution',
  description:
    'PlanIQ helps professional planners and self-planners turn event ideas into plans, budgets, checklists, guests, vendors, and client collaboration. Built for UK and Nigerian event workflows.',
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

function HeroSection() {
  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          Plan smarter events from brief to execution
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-slate-600 sm:text-xl">
          PlanIQ helps professional planners and self-planners turn event ideas into plans,
          budgets, checklists, guests, vendors, and client collaboration — built with UK and
          Nigerian event workflows in mind.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Get started
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            See how it works
          </Link>
        </div>
      </div>
    </section>
  )
}

function TrustBand() {
  return (
    <section className="border-y border-slate-200 bg-slate-50 py-10">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-base text-slate-700 sm:text-lg">
          Built for planners and self-planners managing real event complexity across the UK and
          Nigeria.
        </p>
      </div>
    </section>
  )
}

function FeaturesSection() {
  const cards = [
    {
      heading: 'Plan',
      description:
        'Turn an event brief into a working plan. PlanIQ generates an event concept, structure, and timeline tailored to your event type, location, and goals.',
    },
    {
      heading: 'Budget',
      description:
        'Estimate, track, and adjust spend by category. See where the money is going in pounds or naira, and edit AI-generated budgets to match your reality.',
    },
    {
      heading: 'Coordinate',
      description:
        'Manage checklists, guests, vendors, and RSVPs in one place. Send invite emails, track responses, and keep everyone moving forward.',
    },
    {
      heading: 'Collaborate',
      description:
        'Share read-only views with clients. Send vendor bookings. Capture feedback as comments on the plan, budget, and checklist.',
    },
  ]

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Everything event planning actually needs
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-slate-600">
          Four pillars that cover the full event lifecycle — from the first idea to the day-of
          execution.
        </p>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {cards.map((card) => (
            <div key={card.heading} className="rounded-xl border border-slate-200 bg-white p-8">
              <h3 className="text-xl font-semibold text-slate-900">{card.heading}</h3>
              <p className="mt-3 leading-relaxed text-slate-600">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  const steps = [
    {
      number: 'Step 1',
      heading: 'Tell PlanIQ about your event',
      description:
        'Share the basics: event type, date, location, budget ceiling, and theme. It takes a couple of minutes.',
    },
    {
      number: 'Step 2',
      heading: 'AI builds your plan, budget, and checklist',
      description:
        "PlanIQ generates a tailored event plan, an editable budget by category, and a working checklist. You stay in control — adjust anything that doesn't fit.",
    },
    {
      number: 'Step 3',
      heading: 'Invite collaborators and run the event',
      description:
        'Invite your client to follow along. Send vendor bookings. Send RSVP invites to guests. Track everything from one dashboard until the event happens.',
    },
  ]

  return (
    <section id="how-it-works" className="bg-slate-50 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          How PlanIQ works
        </h2>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="text-left">
              <div className="text-sm font-semibold text-indigo-600">{step.number}</div>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">{step.heading}</h3>
              <p className="mt-3 leading-relaxed text-slate-600">{step.description}</p>
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
      question: 'Who is PlanIQ for?',
      answer:
        'PlanIQ is built for two audiences: professional event planners managing events for clients, and self-planners organising their own wedding, birthday, or corporate event. Both get the full planner experience.',
    },
    {
      question: 'Does PlanIQ work for my type of event?',
      answer:
        'PlanIQ supports weddings, birthdays, and corporate events. The AI adapts the generated plan, budget, and checklist to the event type you choose.',
    },
    {
      question: 'Do my clients and vendors need PlanIQ accounts?',
      answer:
        'Clients and vendors do not sign up from the public signup page. You invite them, and they receive a secure magic-link email that gives them access to the right event view.',
    },
    {
      question: 'Which markets does PlanIQ support?',
      answer:
        'PlanIQ is built for UK and Nigerian event workflows today. Budgets show in pounds or naira based on the event location, and the product is designed around the planning patterns common in those markets.',
    },
    {
      question: 'Is my event data private?',
      answer:
        'Each event starts private to the planner who created it. Clients, vendors, and guests only see the parts you choose to share with them through invites, bookings, RSVP links, or comments. Guest details and detailed budget line items are not shown in public RSVP or vendor views.',
    },
  ]

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Frequently asked questions
        </h2>

        <div className="mt-12 space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-lg border border-slate-200 bg-white p-6"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-base font-medium text-slate-900">
                <span>{faq.question}</span>
                <span className="ml-4 text-slate-400 transition-transform group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <p className="mt-4 leading-relaxed text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCtaSection() {
  return (
    <section className="bg-indigo-600 py-20">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Ready to plan smarter?
        </h2>
        <p className="mt-4 text-lg text-indigo-100">
          Create your PlanIQ account and start your first event in minutes.
        </p>
        <div className="mt-8">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
          >
            Get started
          </Link>
        </div>
      </div>
    </section>
  )
}

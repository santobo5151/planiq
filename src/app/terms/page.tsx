import { MarketingHeaderV2 } from '@/components/marketing/v2/MarketingHeaderV2'
import { MarketingFooterV2 } from '@/components/marketing/v2/MarketingFooterV2'

export const metadata = {
  title: 'Terms of Service | PlanIQ',
}

export default function TermsPage() {
  return (
    <>
      <MarketingHeaderV2 />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <h1 className="font-serif text-3xl sm:text-4xl text-slate-950">Terms of Service</h1>
        <p className="mt-3 text-sm italic text-slate-500">Last updated: [DATE, replace before launch]</p>
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          These are placeholder terms and are not yet legally complete. Replace them with reviewed terms before launch or external user testing.
        </div>
        <div className="mt-8 space-y-4 text-slate-600 leading-relaxed">
          <p>
            PlanIQ is provided &quot;as is&quot; during launch, free of charge. By creating an account you agree to use the service lawfully and not to misuse it or attempt to access data that isn&apos;t yours.
          </p>
          <p>
            PlanIQ uses AI to generate event plans, budgets, and checklists. These are suggestions, and you are responsible for reviewing and adjusting them. We don&apos;t guarantee the accuracy of AI-generated content.
          </p>
          <p>
            [Expand with liability, termination, governing law (UK/Nigeria), and dispute terms before launch.]
          </p>
        </div>
      </main>
      <MarketingFooterV2 />
    </>
  )
}

import { MarketingHeaderV2 } from '@/components/marketing/v2/MarketingHeaderV2'
import { MarketingFooterV2 } from '@/components/marketing/v2/MarketingFooterV2'

export const metadata = {
  title: 'Privacy Policy | PlanIQ',
}

export default function PrivacyPage() {
  return (
    <>
      <MarketingHeaderV2 />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <h1 className="font-serif text-3xl sm:text-4xl text-slate-950">Privacy Policy</h1>
        <p className="mt-3 text-sm italic text-slate-500">Last updated: [DATE, replace before launch]</p>
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          This is a placeholder privacy policy and is not yet legally complete. Replace it with a reviewed policy before launch and before collecting real user data beyond internal testing.
        </div>
        <div className="mt-8 space-y-4 text-slate-600 leading-relaxed">
          <p>
            PlanIQ collects the information you provide when you create an account, plan events, and invite collaborators, including your name, email address, and the event details you enter. We use it to provide the service: generating plans, sending invites and RSVP emails, and enabling client and vendor collaboration.
          </p>
          <p>
            We do not sell your personal data. We use Supabase (database and authentication), Anthropic (AI plan generation), and Resend (email delivery) as processors. [Expand with retention, legal basis, data-subject rights, and contact details before launch.]
          </p>
          <p>
            Questions about your data:{' '}
            <a href="mailto:privacy@planiq.ai" className="text-indigo-600 hover:underline">
              privacy@planiq.ai
            </a>
          </p>
        </div>
      </main>
      <MarketingFooterV2 />
    </>
  )
}

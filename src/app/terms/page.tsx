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
        <p className="mt-3 text-sm italic text-slate-500">Last updated: 12 June 2026</p>
        <div className="mt-8 space-y-4 text-slate-600 leading-relaxed">
          <p>These terms govern your use of PlanIQ. By creating an account or using the service, you agree to them.</p>
        </div>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">The service</h2>
        <p className="text-slate-600 leading-relaxed">PlanIQ is an AI-assisted event-planning workspace for planners and their clients, vendors, and guests. During this launch period the service is provided free of charge, and we may add, change, or remove features.</p>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">Eligibility and your account</h2>
        <p className="text-slate-600 leading-relaxed">You must be old enough to enter a contract in your country to use PlanIQ. PlanIQ may be used by professional planners, planning businesses, and individuals planning their own events. If you use PlanIQ on behalf of a business or organisation, you confirm that you have authority to accept these terms for that business or organisation. You are responsible for keeping your login details secure and for activity under your account. Tell us promptly if you think your account has been compromised.</p>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">Acceptable use</h2>
        <p className="text-slate-600 leading-relaxed">You agree to use PlanIQ lawfully and not to: misuse the service; attempt to access data that isn&apos;t yours; interfere with its security or operation; or upload unlawful content or anyone else&apos;s personal data without a proper basis to do so.</p>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">AI-generated content</h2>
        <p className="text-slate-600 leading-relaxed">PlanIQ uses AI to generate plans, budgets, and checklists. These are <strong>suggestions</strong>. You are responsible for reviewing outputs before using them with clients, vendors, guests, or other third parties, including checking budgets, timings, vendor suitability, contractual commitments, safety, accessibility, and any legal or venue-specific requirements. We don&apos;t guarantee the accuracy, completeness, or suitability of AI-generated content, and you shouldn&apos;t rely on it as professional (for example, financial or legal) advice.</p>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">Your content</h2>
        <p className="text-slate-600 leading-relaxed">You keep ownership of the content you put into PlanIQ. You grant us permission to host and process it as needed to provide the service. You are responsible for the content you add, including other people&apos;s details you enter (see our Privacy Policy).</p>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">Availability and &quot;as is&quot;</h2>
        <p className="text-slate-600 leading-relaxed">We work to keep PlanIQ available and reliable, but during this free launch period it is provided <strong>&quot;as is&quot;</strong> and <strong>&quot;as available&quot;</strong>, without warranties of any kind. We don&apos;t promise it will be uninterrupted or error-free. If we introduce paid plans, the fees, billing terms, cancellation rights, and any applicable taxes will be presented to you before you subscribe or make a payment.</p>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">Limitation of liability</h2>
        <p className="text-slate-600 leading-relaxed">Nothing in these terms limits or excludes liability where it would be unlawful to do so — including liability for fraud, for death or personal injury caused by negligence, or for your mandatory rights as a consumer. Subject to that, and to the fullest extent permitted by law, PlanIQ and Blackruby Technologies Limited will not be liable for indirect or consequential loss, or for loss of data, profit, or business, arising from your use of the service. This is a free service during launch, which is reflected in these terms.</p>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">Suspension and termination</h2>
        <p className="text-slate-600 leading-relaxed">You can stop using PlanIQ and close your account at any time. We may suspend or end access if you breach these terms or use the service in a way that risks harm to others or to the service.</p>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">Changes to these terms</h2>
        <p className="text-slate-600 leading-relaxed">We may update these terms as the service develops. The &quot;last updated&quot; date shows when they last changed. If you keep using PlanIQ after a change, you accept the updated terms.</p>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">Governing law</h2>
        <p className="text-slate-600 leading-relaxed">These terms are governed by the laws of <strong>England and Wales</strong>. If you are using PlanIQ as a consumer, this does not deprive you of any mandatory protections, or of any right to bring proceedings, that you may have under the laws of your country of residence, including Nigeria where applicable.</p>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">Contact</h2>
        <p className="text-slate-600 leading-relaxed">Questions about these terms: <strong><a href="mailto:hello@planiq.ai" className="text-indigo-600 hover:underline">hello@planiq.ai</a></strong></p>
      </main>
      <MarketingFooterV2 />
    </>
  )
}

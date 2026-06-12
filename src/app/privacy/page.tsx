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
        <p className="mt-3 text-sm italic text-slate-500">Last updated: 12 June 2026</p>
        <div className="mt-8 space-y-4 text-slate-600 leading-relaxed">
          <p>This policy explains what personal data PlanIQ collects, how we use it, and the rights you have over it. It applies to planners, clients, vendors, guests, and visitors to our website.</p>
        </div>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">Who we are</h2>
        <p className="text-slate-600 leading-relaxed">PlanIQ is operated by <strong>Blackruby Technologies Limited</strong> (company number 13754830), registered in England &amp; Wales at Office 1576, 321-323 High Road, Chadwell Heath, Essex, RM6 6AX, with operations also in Nigeria at 68A Adeola Odeku Street, Victoria Island, Lagos. We are the data controller for the personal data described in this policy.</p>
        <p className="mt-4 text-slate-600 leading-relaxed">For any privacy question or to exercise your rights, contact us at <strong><a href="mailto:privacy@planiq.ai" className="text-indigo-600 hover:underline">privacy@planiq.ai</a></strong>.</p>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">What data we collect</h2>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed">
          <li><strong>Account and profile data:</strong> your name, email address, password (stored only in hashed form by our authentication provider), and — for professional planners — your business name.</li>
          <li><strong>Event data you enter:</strong> event details, budgets, checklists, plans, guest lists, and vendor information you add to the service.</li>
          <li><strong>Information about other people you add:</strong> when you invite a client or vendor, or add a guest, you provide their name and (for clients and vendors) email address. If you are a planner adding other people&apos;s details, you are responsible for having a proper basis to share that information with us, and for telling those people their data is being processed in PlanIQ.</li>
          <li><strong>Communications:</strong> invitation and RSVP responses, comments you post, and messages you send us.</li>
          <li><strong>Newsletter:</strong> if you sign up, your email address.</li>
          <li><strong>Technical data:</strong> standard server and security logs (such as IP address and timestamps) generated when you use the service.</li>
          <li><strong>Payment data:</strong> PlanIQ is currently free during launch and does not collect payment details. If we introduce paid plans, we will update this policy before collecting any billing or payment information.</li>
        </ul>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">How we use your data, and our legal basis</h2>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed">
          <li>To <strong>provide the service</strong> — creating your account, generating plans, sending invites and RSVP emails, and enabling client and vendor collaboration. Legal basis: <strong>performance of a contract</strong> with you.</li>
          <li>To <strong>keep the service secure</strong> and prevent misuse. Legal basis: our <strong>legitimate interests</strong> in protecting the service and its users.</li>
          <li>To <strong>send you our newsletter</strong>, if you opted in. Legal basis: <strong>consent</strong>, which you can withdraw at any time.</li>
          <li>To <strong>comply with legal obligations</strong> where they apply.</li>
        </ul>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">AI-generated content</h2>
        <p className="text-slate-600 leading-relaxed">PlanIQ uses Anthropic&apos;s Claude AI to generate event plans, budgets, and checklists from the event details you submit. Anthropic processes this data on our behalf as a processor. Under Anthropic&apos;s current commercial terms, Anthropic does not use PlanIQ&apos;s inputs or outputs to train its models unless we separately opt in to such use, which we do not. AI output is a suggestion only — see our Terms of Service.</p>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">Who we share your data with</h2>
        <p className="text-slate-600 leading-relaxed">We do not sell your personal data. We share it only with service providers who process it on our behalf, under contract:</p>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed mt-4">
          <li><strong>Supabase</strong> — database hosting and authentication. Data is stored in the EU (Ireland).</li>
          <li><strong>Anthropic</strong> — AI generation of plans, budgets, and checklists (United States).</li>
          <li><strong>Resend</strong> — delivery of transactional and authentication emails (EU, Ireland).</li>
          <li><strong>Vercel</strong> — hosting of the application.</li>
        </ul>
        <p className="mt-4 text-slate-600 leading-relaxed">These providers may also process limited technical and security data as needed to operate, protect, and comply with legal obligations relating to their own services.</p>
        <p className="mt-4 text-slate-600 leading-relaxed">We may also disclose data where required by law.</p>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">International transfers</h2>
        <p className="text-slate-600 leading-relaxed">Your data is primarily stored in the EU (Ireland). Where data is transferred outside the UK or EEA — for example to a US-based processor such as Anthropic — that transfer is protected by appropriate safeguards, such as the UK International Data Transfer Agreement (IDTA) or the EU Standard Contractual Clauses with the UK Addendum.</p>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">How long we keep it</h2>
        <p className="text-slate-600 leading-relaxed">We keep account and event data for as long as your account is active or as needed to provide the service. If you ask us to delete your account, we will delete or anonymise your personal data within a reasonable period, unless we need to retain it to comply with law, resolve disputes, prevent misuse, or enforce our terms. Backup copies may persist for a limited period before being overwritten. Security logs are kept for a limited period. Newsletter data is kept until you unsubscribe.</p>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">Your rights</h2>
        <p className="text-slate-600 leading-relaxed">Depending on where you are, you have rights under the UK GDPR and/or the Nigeria Data Protection Act 2023. These include the right to:</p>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed mt-4">
          <li>access the personal data we hold about you;</li>
          <li>ask us to correct inaccurate data;</li>
          <li>ask us to delete your data;</li>
          <li>restrict or object to how we process it;</li>
          <li>receive your data in a portable, machine-readable format; and</li>
          <li>withdraw consent where we rely on it.</li>
        </ul>
        <p className="mt-4 text-slate-600 leading-relaxed">To exercise any of these, email <strong><a href="mailto:privacy@planiq.ai" className="text-indigo-600 hover:underline">privacy@planiq.ai</a></strong>. We will respond within the time limits set by the applicable law.</p>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">Cookies</h2>
        <p className="text-slate-600 leading-relaxed">PlanIQ uses only <strong>strictly necessary cookies</strong> — those required to log you in and keep your session secure. We do not use advertising or analytics cookies, so no cookie-consent banner is needed. If this changes, we will update this policy and ask for your consent where the law requires it.</p>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">Complaints</h2>
        <p className="text-slate-600 leading-relaxed">If you are in the UK and have a concern we haven&apos;t resolved, you can complain to the Information Commissioner&apos;s Office (ICO) at ico.org.uk. If you are in Nigeria, you can complain to the Nigeria Data Protection Commission (NDPC) at ndpc.gov.ng.</p>

        <h2 className="font-serif text-xl text-slate-900 mt-10 mb-3">Changes to this policy</h2>
        <p className="text-slate-600 leading-relaxed">We may update this policy from time to time. The &quot;last updated&quot; date above shows when it last changed. Significant changes will be communicated where appropriate.</p>

        <p className="mt-8 text-slate-600 leading-relaxed">Questions about your data: <strong><a href="mailto:privacy@planiq.ai" className="text-indigo-600 hover:underline">privacy@planiq.ai</a></strong></p>
      </main>
      <MarketingFooterV2 />
    </>
  )
}

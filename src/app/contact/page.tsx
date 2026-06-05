import { MarketingHeaderV2 } from '@/components/marketing/v2/MarketingHeaderV2'
import { MarketingFooterV2 } from '@/components/marketing/v2/MarketingFooterV2'

export const metadata = {
  title: 'Contact | PlanIQ',
}

export default function ContactPage() {
  return (
    <>
      <MarketingHeaderV2 />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <h1 className="font-serif text-3xl sm:text-4xl text-slate-950">Contact</h1>
        <div className="mt-6 space-y-4 text-slate-600 leading-relaxed">
          <p>Have a question about PlanIQ, or need a hand getting started? We&apos;d love to hear from you.</p>
          <p>
            Email:{' '}
            <a href="mailto:hello@planiq.ai" className="text-indigo-600 hover:underline">
              hello@planiq.ai
            </a>
          </p>
          <p>We aim to reply within two working days.</p>
        </div>
      </main>
      <MarketingFooterV2 />
    </>
  )
}

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
            <strong>General enquiries:</strong>{' '}
            <a href="mailto:hello@planiq.ai" className="text-indigo-600 hover:underline">hello@planiq.ai</a>
          </p>
          <p>
            <strong>Privacy and data requests:</strong>{' '}
            <a href="mailto:privacy@planiq.ai" className="text-indigo-600 hover:underline">privacy@planiq.ai</a>
          </p>
          <p>We aim to reply within two working days.</p>
        </div>
        <hr className="my-8 border-slate-200" />
        <p className="text-slate-600 leading-relaxed">
          <strong>PlanIQ is operated by Blackruby Technologies Limited</strong> (company number 13754830), registered in England &amp; Wales at Office 1576, 321-323 High Road, Chadwell Heath, Essex, RM6 6AX, with operations also in Nigeria at 68A Adeola Odeku Street, Victoria Island, Lagos.
        </p>
      </main>
      <MarketingFooterV2 />
    </>
  )
}

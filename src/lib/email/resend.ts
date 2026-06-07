import 'server-only'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const from = process.env.RESEND_FROM_EMAIL ?? 'noreply@planiq.ai'
    const { error } = await resend.emails.send({ from, to, subject, html })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error sending email',
    }
  }
}

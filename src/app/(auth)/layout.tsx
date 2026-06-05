import Link from 'next/link'
import { Wordmark } from '@/components/brand/Wordmark'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50 px-4 py-12">
      <Link href="/" className="mb-8">
        <Wordmark className="text-3xl" />
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}

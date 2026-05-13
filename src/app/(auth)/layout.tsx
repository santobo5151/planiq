import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-indigo-50 px-4 py-12">
      <Link href="/" className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-indigo-600">
          PlanIQ
        </h1>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}

import Image from 'next/image'
import { cn } from '@/lib/utils'

type BrowserFrameProps = {
  src: string
  alt: string
  urlLabel: string
  width: number
  height: number
  priority?: boolean
  className?: string
}

export function BrowserFrame({
  src,
  alt,
  urlLabel,
  width,
  height,
  priority,
  className,
}: BrowserFrameProps) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-900/10 shadow-xl", className)}>
      {/* Faux browser chrome bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        {/* Traffic-light dots */}
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-400" aria-hidden="true" />
          <span className="h-3 w-3 rounded-full bg-amber-400" aria-hidden="true" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" aria-hidden="true" />
        </div>
        {/* URL pill — min-w-0 + truncate so long URLs do not push dots off-screen on mobile */}
        <div className="ml-2 min-w-0 flex-1 truncate rounded-md bg-white px-3 py-1 text-xs text-slate-500 ring-1 ring-slate-200">
          {urlLabel}
        </div>
      </div>
      {/* Screenshot */}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        quality={85}
        className="w-full h-auto"
      />
    </div>
  )
}

import type { ReactNode } from 'react'
import { Zap } from 'lucide-react'

/**
 * Onboarding previews are cut down to arrive while someone is watching, and a
 * sample judged as the agent's best work undersells it - people decide on
 * this screen. So every preview says what it is, next to the result.
 */
export function QuickSampleTag() {
  return (
    <span className='rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300'>
      Quick sample
    </span>
  )
}

export function QuickSampleNote({ children }: { children: ReactNode }) {
  return (
    <div className='flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900 dark:bg-amber-950/30'>
      <Zap className='mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400' />
      <p className='text-amber-900 dark:text-amber-200'>
        <span className='font-semibold'>This is a quick sample. </span>
        {children}
      </p>
    </div>
  )
}

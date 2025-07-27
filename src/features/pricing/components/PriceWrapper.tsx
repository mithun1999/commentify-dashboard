import type React from 'react'
import { cn } from '@/lib/utils'

interface PriceWrapperProps {
  children: React.ReactNode
  className?: string
}

function PriceWrapper({ children, className }: PriceWrapperProps) {
  return (
    <div
      className={cn(
        'border-border bg-card mb-4 rounded-xl border shadow-sm',
        'self-center lg:self-start',
        className
      )}
    >
      {children}
    </div>
  )
}

export default PriceWrapper

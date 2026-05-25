import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const PRESET_REASONS = [
  "Off-topic for my audience",
  "Doesn't sound like my voice",
  "Hook is weak",
  "Already posted something similar",
  "Wrong format for this content",
  "Too generic, no real insight",
] as const

interface RejectPostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: string) => void
  isPending?: boolean
}

export function RejectPostDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: RejectPostDialogProps) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) setReason('')
  }, [open])

  const trimmed = reason.trim()
  const canSubmit = trimmed.length >= 3 && !isPending

  const togglePreset = (preset: string) => {
    setReason((current) => {
      const t = current.trim()
      if (!t) return preset
      if (t === preset) return ''
      return `${t}. ${preset}`
    })
  }

  const handleConfirm = () => {
    if (!canSubmit) return
    onConfirm(trimmed)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Reject this post?</DialogTitle>
          <DialogDescription>
            Tell us what's wrong. The reason is used to generate a better
            replacement — be specific so the next version doesn't repeat the
            same mistake.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3'>
          <div className='flex flex-wrap gap-1.5'>
            {PRESET_REASONS.map((preset) => {
              const isSelected = reason.toLowerCase().includes(preset.toLowerCase())
              return (
                <Badge
                  key={preset}
                  variant={isSelected ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer text-xs font-normal',
                    isSelected
                      ? 'hover:bg-primary/90'
                      : 'hover:bg-muted',
                  )}
                  onClick={() => togglePreset(preset)}
                >
                  {preset}
                </Badge>
              )
            })}
          </div>

          <Textarea
            placeholder='Or write your own reason (e.g. "The CTA is too pushy" or "Focus on retention not acquisition")'
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            maxLength={500}
            autoFocus
          />
          <div className='text-muted-foreground flex justify-end text-xs'>
            {reason.length}/500
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant='destructive'
            onClick={handleConfirm}
            disabled={!canSubmit}
          >
            {isPending ? 'Rejecting…' : 'Reject & regenerate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

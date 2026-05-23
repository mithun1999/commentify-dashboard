import { useState, useEffect, useRef } from 'react'
import { IconLoader2, IconSparkles, IconUpload } from '@tabler/icons-react'
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
import { Label } from '@/components/ui/label'
import type { PostMedia } from '../api/post-generator.api'

interface RegenerateImageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  media: PostMedia | null
  onRegenerate: (instruction: string) => void
  onReplaceUpload: (file: File) => void
  isRegenerating?: boolean
  isUploading?: boolean
}

const INSTRUCTION_MAX = 1000

export function RegenerateImageDialog({
  open,
  onOpenChange,
  media,
  onRegenerate,
  onReplaceUpload,
  isRegenerating,
  isUploading,
}: RegenerateImageDialogProps) {
  const [instruction, setInstruction] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const busy = !!(isRegenerating || isUploading)

  useEffect(() => {
    if (!open) setInstruction('')
  }, [open])

  const handleSubmit = () => {
    const trimmed = instruction.trim()
    if (!trimmed) return
    onRegenerate(trimmed)
  }

  const handleUploadClick = () => {
    if (!fileInputRef.current) return
    fileInputRef.current.accept = 'image/png,image/jpeg,image/webp,image/gif'
    fileInputRef.current.value = ''
    fileInputRef.current.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onReplaceUpload(file)
  }

  const kindLabel =
    media?.aiKind === 'dashboard_screenshot'
      ? 'dashboard screenshot'
      : 'chat screenshot'

  return (
    <Dialog open={open} onOpenChange={(o) => (busy ? null : onOpenChange(o))}>
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>Replace this image</DialogTitle>
          <DialogDescription>
            Tell us what to change in this {kindLabel} and we'll remix it —
            or upload your own image instead.
          </DialogDescription>
        </DialogHeader>

        {media?.url && (
          <div className='flex justify-center'>
            <img
              src={media.url}
              alt='Current image'
              className='max-h-64 rounded-md border object-contain'
            />
          </div>
        )}

        <div className='grid gap-2'>
          <Label htmlFor='regen-instruction'>What would you like to change?</Label>
          <p className='text-muted-foreground text-xs'>
            Be specific — e.g. "switch to iMessage instead of WhatsApp", "the
            last message should say 'on my way'", "show MRR dropping instead",
            "redact the contact name with red marker".
          </p>
          <Textarea
            id='regen-instruction'
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder='Describe what should be different about this image'
            rows={4}
            maxLength={INSTRUCTION_MAX}
            disabled={busy}
          />
          <p className='text-muted-foreground text-[10px]'>
            High-quality remix takes ~2–3 minutes.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type='file'
          className='hidden'
          onChange={handleFileChange}
        />

        <DialogFooter className='sm:justify-between'>
          <Button
            type='button'
            variant='ghost'
            onClick={handleUploadClick}
            disabled={busy}
          >
            {isUploading ? (
              <IconLoader2 className='mr-2 size-4 animate-spin' />
            ) : (
              <IconUpload className='mr-2 size-4' />
            )}
            Upload your own
          </Button>
          <Button
            type='button'
            onClick={handleSubmit}
            disabled={busy || !instruction.trim()}
          >
            {isRegenerating ? (
              <IconLoader2 className='mr-2 size-4 animate-spin' />
            ) : (
              <IconSparkles className='mr-2 size-4' />
            )}
            Remix with AI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { useRef, useState } from 'react'
import { IconFileUpload, IconLoader2 } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useCreateNote } from '../query/library.query'

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT = '.md,.markdown,.txt,.pdf'

/**
 * Add to the library from a link, a file (.md, .txt, .pdf up to 10 MB) or
 * pasted text. Reading happens in the background; the note shows "Reading…"
 * until its points are ready.
 */
export function AddNoteDialog({
  open,
  onOpenChange,
  profileId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Set when adding from a profile's Library tab. */
  profileId?: string
}) {
  const create = useCreateNote()
  const [tab, setTab] = useState<'link' | 'file' | 'paste'>('link')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  // A link left unticked is judged when it's read; files and text are yours.
  const [mine, setMine] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const reset = () => {
    setUrl('')
    setFile(null)
    setText('')
    setTitle('')
    setMine(false)
    setFileError(null)
  }
  const close = () => {
    reset()
    onOpenChange(false)
  }

  const pickFile = (f: File | undefined) => {
    setFileError(null)
    if (!f) return setFile(null)
    if (!/\.(md|markdown|txt|pdf)$/i.test(f.name)) {
      setFileError('Pick a .md, .txt or .pdf file.')
      return setFile(null)
    }
    if (f.size > MAX_BYTES) {
      setFileError('Files can be up to 10 MB.')
      return setFile(null)
    }
    setFile(f)
  }

  const ready =
    tab === 'link'
      ? url.trim().length > 3
      : tab === 'file'
        ? !!file
        : text.trim().length >= 40

  const submit = () => {
    const input =
      tab === 'link'
        ? { url: url.trim(), ...(mine ? { mine: true } : {}) }
        : tab === 'file'
          ? { file: file!, ...(title.trim() ? { title: title.trim() } : {}) }
          : { text, ...(title.trim() ? { title: title.trim() } : {}) }
    create.mutate(
      { ...input, ...(profileId ? { profileId } : {}) },
      { onSuccess: close }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(true) : close())}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Add to library</DialogTitle>
          <DialogDescription>
            We read it once and keep every number, quote and point with where it
            came from. Posts can then be built on it.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='link'>Link</TabsTrigger>
            <TabsTrigger value='file'>File</TabsTrigger>
            <TabsTrigger value='paste'>Paste text</TabsTrigger>
          </TabsList>

          <TabsContent value='link' className='space-y-2 pt-2'>
            <Input
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder='https://… an article, a case study, a page of yours'
              onKeyDown={(e) => e.key === 'Enter' && ready && submit()}
            />
            <label className='flex items-start gap-2 text-sm'>
              <Checkbox
                checked={mine}
                onCheckedChange={(v) => setMine(v === true)}
                className='mt-0.5'
              />
              <span>
                It&apos;s mine: my site, my company or my writing
                <span className='text-muted-foreground block text-xs'>
                  Posts then say it as you (&ldquo;our customers&rdquo;) instead
                  of quoting it as someone else&apos;s.
                </span>
              </span>
            </label>
          </TabsContent>

          <TabsContent value='file' className='space-y-3 pt-2'>
            <button
              type='button'
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                pickFile(e.dataTransfer.files?.[0])
              }}
              className='hover:bg-muted/50 flex w-full flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-sm'
            >
              <IconFileUpload className='text-muted-foreground size-6' />
              {file ? (
                <span className='font-medium'>{file.name}</span>
              ) : (
                <span className='text-muted-foreground'>
                  Drop a file here or click to choose. .md, .txt or .pdf, up to
                  10 MB.
                </span>
              )}
            </button>
            <input
              ref={inputRef}
              type='file'
              accept={ACCEPT}
              className='hidden'
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            {fileError && <p className='text-xs text-red-600'>{fileError}</p>}
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='Title (optional)'
            />
            <p className='text-muted-foreground text-xs'>
              PDFs need selectable text; scanned pages can't be read.
            </p>
          </TabsContent>

          <TabsContent value='paste' className='space-y-3 pt-2'>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='Title (optional)'
            />
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='Paste notes, a transcript, a customer story, a draft…'
              className='min-h-[180px]'
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className='gap-2'>
          <Button variant='outline' onClick={close} disabled={create.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!ready || create.isPending}>
            {create.isPending && (
              <IconLoader2 className='mr-1 size-4 animate-spin' />
            )}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

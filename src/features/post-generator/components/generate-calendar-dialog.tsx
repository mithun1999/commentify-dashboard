import { useState, useEffect } from 'react'
import { IconLoader2, IconSparkles } from '@tabler/icons-react'
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
import type { CalendarUserContextInput } from '../api/post-generator.api'

interface GenerateCalendarDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate: (userContext?: CalendarUserContextInput) => void
  isPending?: boolean
  weekLabel?: string
}

const FIELD_MAX = 2000

function trimToInput(raw: {
  thisWeekEvents: string
  nextWeekThemes: string
  specificStories: string
  avoidTopics: string
}): CalendarUserContextInput | undefined {
  const clean = (v: string) => {
    const t = v.trim()
    return t ? t.slice(0, FIELD_MAX) : undefined
  }
  const ctx: CalendarUserContextInput = {
    thisWeekEvents: clean(raw.thisWeekEvents),
    nextWeekThemes: clean(raw.nextWeekThemes),
    specificStories: clean(raw.specificStories),
    avoidTopics: clean(raw.avoidTopics),
  }
  return Object.values(ctx).some(Boolean) ? ctx : undefined
}

export function GenerateCalendarDialog({
  open,
  onOpenChange,
  onGenerate,
  isPending,
  weekLabel,
}: GenerateCalendarDialogProps) {
  const [thisWeekEvents, setThisWeekEvents] = useState('')
  const [nextWeekThemes, setNextWeekThemes] = useState('')
  const [specificStories, setSpecificStories] = useState('')
  const [avoidTopics, setAvoidTopics] = useState('')

  useEffect(() => {
    if (!open) {
      setThisWeekEvents('')
      setNextWeekThemes('')
      setSpecificStories('')
      setAvoidTopics('')
    }
  }, [open])

  const handleGenerate = () => {
    const ctx = trimToInput({
      thisWeekEvents,
      nextWeekThemes,
      specificStories,
      avoidTopics,
    })
    onGenerate(ctx)
  }

  const handleSkip = () => {
    onGenerate(undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] flex-col sm:max-w-2xl'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>What's on your mind?</DialogTitle>
          <DialogDescription>
            {weekLabel
              ? `Help us personalize ${weekLabel}. All fields are optional — skip to use your voice profile defaults.`
              : 'Help us personalize this week. All fields are optional — skip to use your voice profile defaults.'}
          </DialogDescription>
        </DialogHeader>

        <div className='-mx-6 grid flex-1 gap-5 overflow-y-auto px-6 py-2'>
          <div className='grid gap-2'>
            <Label htmlFor='this-week-events'>
              What did you do this week?
            </Label>
            <p className='text-muted-foreground text-xs'>
              Wins, losses, learnings, calls, moments — anything that stuck with
              you.
            </p>
            <Textarea
              id='this-week-events'
              value={thisWeekEvents}
              onChange={(e) => setThisWeekEvents(e.target.value)}
              placeholder='e.g. closed a tough deal after 3 calls / shipped a feature nobody asked for / hard 1:1 with a teammate'
              rows={3}
              maxLength={FIELD_MAX}
              disabled={isPending}
              className='max-h-40 overflow-y-auto'
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='next-week-themes'>
              What's on your mind for next week?
            </Label>
            <p className='text-muted-foreground text-xs'>
              Themes you want to explore or things you've been thinking about.
            </p>
            <Textarea
              id='next-week-themes'
              value={nextWeekThemes}
              onChange={(e) => setNextWeekThemes(e.target.value)}
              placeholder='e.g. why founder-led sales beats SDR teams / hiring the first PM / staying focused with 10 inbound calls a week'
              rows={3}
              maxLength={FIELD_MAX}
              disabled={isPending}
              className='max-h-40 overflow-y-auto'
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='specific-stories'>
              Any specific stories, calls, or conversations you want turned
              into posts?
            </Label>
            <p className='text-muted-foreground text-xs'>
              Customer dialogue, a moment from a meeting, a DM that surprised
              you.
            </p>
            <Textarea
              id='specific-stories'
              value={specificStories}
              onChange={(e) => setSpecificStories(e.target.value)}
              placeholder='e.g. a customer told me "I only need the one feature, the rest is noise" — that changed our roadmap'
              rows={3}
              maxLength={FIELD_MAX}
              disabled={isPending}
              className='max-h-40 overflow-y-auto'
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='avoid-topics'>Anything to avoid this week?</Label>
            <p className='text-muted-foreground text-xs'>
              Topics, themes, or framings you don't want to post about.
            </p>
            <Textarea
              id='avoid-topics'
              value={avoidTopics}
              onChange={(e) => setAvoidTopics(e.target.value)}
              placeholder='e.g. no hiring talk, no fundraising posts'
              rows={2}
              maxLength={FIELD_MAX}
              disabled={isPending}
              className='max-h-40 overflow-y-auto'
            />
          </div>
        </div>

        <DialogFooter className='shrink-0'>
          <Button
            type='button'
            variant='ghost'
            onClick={handleSkip}
            disabled={isPending}
          >
            Skip & use defaults
          </Button>
          <Button type='button' onClick={handleGenerate} disabled={isPending}>
            {isPending ? (
              <IconLoader2 className='mr-2 size-4 animate-spin' />
            ) : (
              <IconSparkles className='mr-2 size-4' />
            )}
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

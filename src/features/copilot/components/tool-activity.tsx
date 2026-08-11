import { useNavigate } from '@tanstack/react-router'
import { formatDistanceToNow } from 'date-fns'
import { Check, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmCard, type PendingConfirmation } from './confirm-card'

interface UpgradePath {
  from: string
  to: string
}

interface StyleChange {
  field: string
  from: unknown
  to: unknown
}

interface ListChange {
  field: string
  added: string[]
  removed: string[]
}

interface ToolOutput {
  ok: boolean
  data?: {
    changed?: StyleChange[]
    added?: string[]
    removed?: string[]
    lists?: ListChange[]
    enabled?: boolean
    alreadySet?: boolean
    scheduledAt?: string
    scheduledFor?: string
    approved?: number
    topic?: string
    posts?: number
    updated?: boolean
    name?: string
  }
  refusal?: {
    reason: string
    message: string
    upgrade?: UpgradePath | null
    confirmation?: PendingConfirmation
  }
}

/**
 * What a tool call looks like once it has run.
 *
 * Deliberately one line. The agent's own reply already explains what happened
 * in the user's terms; repeating it in a card would say everything twice, and
 * a settings change is not an event worth a box around it.
 */
export function ToolActivity({
  toolName,
  state,
  input,
  output,
}: {
  toolName: string
  state: string
  input?: Record<string, unknown>
  output?: ToolOutput
}) {
  const navigate = useNavigate()
  const running = state !== 'output-available' && state !== 'output-error'
  const refusal = output?.refusal
  // Waiting on a click is not a failure: nothing was attempted, so the card
  // speaks for itself and the usual "Couldn't do X" line would be a lie.
  const held = refusal?.reason === 'confirm' && refusal.confirmation
  const failed = output?.ok === false && !held

  if (held) {
    return <ConfirmCard confirmation={refusal!.confirmation!} />
  }

  return (
    <div className='text-muted-foreground space-y-2 text-xs'>
      <div className='flex items-center gap-1.5'>
        {running ? (
          <Loader2 className='size-3 shrink-0 animate-spin' />
        ) : failed ? (
          <X className='size-3 shrink-0' />
        ) : (
          <Check className='size-3 shrink-0' />
        )}
        <span>{label(toolName, running, failed, input, output)}</span>
      </div>

      {refusal?.upgrade && (
        <Button
          size='sm'
          variant='outline'
          className='h-7 text-xs'
          onClick={() => navigate({ to: '/plans' })}
        >
          {/* No unit travels with `raisesTo`, and it means posts a day for one
              limit and total creators for another. The agent's reply states the
              number; the button only has to name the tier. */}
          Upgrade to {refusal.upgrade.to}
        </Button>
      )}
    </div>
  )
}

/** Reads are all the same shape of event: the agent went and looked something up. */
const READ_LABELS: Record<string, string> = {
  list_profiles: 'your profiles',
  get_agent_status: 'your agent',
  get_comment_activity: 'your comment queue',
  get_upcoming_posts: 'your content calendar',
  get_pending_comments: 'what is waiting for approval',
  get_plan: 'what your plan allows',
  get_credits: 'your credits',
  get_audience_growth: 'how your audience is growing',
  get_posting_setup: 'how your posting agent is set up',
  get_account: 'your account',
  get_comment_counts: 'your comment numbers',
  get_completed_comments: 'what it has posted',
  get_posting_stats: 'how your posting is going',
  get_monitored_creators: 'the creators you follow',
  get_mastery_signals: 'what it has learned about your voice',
  get_post_draft: 'the post',
}

const STYLE_LABELS: Record<string, string> = {
  turnOnEmoji: 'emoji',
  turnOnExclamations: 'exclamation marks',
  writeInLowercase: 'lowercase',
  length: 'length',
}

function describeChange({ field, to }: StyleChange): string {
  const name = STYLE_LABELS[field] ?? field
  if (typeof to === 'boolean') return `${name} ${to ? 'on' : 'off'}`
  return `${name} ${String(to)}`
}

const FILTER_LABELS: Record<string, string> = {
  skipHiringPosts: 'hiring posts',
  skipJobUpdatePosts: 'new-job posts',
  skipArticlePosts: 'articles',
  skipCompanyPosts: 'company posts',
  regions: 'regions',
  authorJobTitles: 'job titles',
  blockedAuthors: 'blocked authors',
}

function describeFilter({ field, to }: StyleChange): string {
  if (field === 'language') return `language ${String(to)}`
  if (field === 'minimumEngagement') {
    return to === 'disabled'
      ? 'engagement filter off'
      : `engagement filter ${String(to)}`
  }
  const name = FILTER_LABELS[field] ?? field
  return to ? `skipping ${name}` : `allowing ${name}`
}

function describeFilterList({ field, added, removed }: ListChange): string {
  const name = FILTER_LABELS[field] ?? field
  const parts = [
    added.length ? `+${added.join(', ')}` : '',
    removed.length ? `-${removed.join(', ')}` : '',
  ].filter(Boolean)
  return `${name} ${parts.join(' ')}`
}

function describeSchedule({ field, to }: StyleChange): string {
  switch (field) {
    case 'postsPerWeek':
      return `${to} posts a week`
    case 'preferredDays':
      return Array.isArray(to) ? (to as string[]).join(', ') : String(to)
    case 'preferredTime':
      return `posting at ${to}`
    default:
      return `${field} ${String(to)}`
  }
}

/** "linkedin-commenting" is a job queue name, not something to show a person. */
/**
 * Relative rather than a clock time: the tool takes a delay from now, so
 * "in about 2 hours" is what the user actually asked for. An absolute time
 * would also have to be right about their timezone, and this line is not
 * worth being wrong about that.
 */
function describeWhen(iso: string): string {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return 'a new time'
  return formatDistanceToNow(at, { addSuffix: true })
}

function describeAgent(agent: unknown): string {
  if (typeof agent !== 'string') return 'that agent'
  const [platform, role] = agent.split('-')
  const name = platform === 'linkedin' ? 'LinkedIn' : platform === 'twitter' ? 'X' : platform
  return `your ${name} ${role} agent`
}

/**
 * The list tools report what moved rather than the resulting list, so a change
 * of two terms reads as two terms instead of the whole set.
 */
function describeListChange(
  output: ToolOutput | undefined,
  noun: string
): string {
  const added = output?.data?.added ?? []
  const removed = output?.data?.removed ?? []
  const parts = [
    added.length ? `Added ${added.join(', ')}` : '',
    removed.length ? `Removed ${removed.join(', ')}` : '',
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : `No ${noun} to change`
}

function label(
  toolName: string,
  running: boolean,
  failed: boolean,
  input?: Record<string, unknown>,
  output?: ToolOutput
): string {
  const read = READ_LABELS[toolName]
  if (read) {
    if (failed) return `Couldn't check ${read}`
    return running ? `Checking ${read}` : `Checked ${read}`
  }

  switch (toolName) {
    case 'update_comment_style': {
      if (running) return 'Updating comment style'
      if (failed) return "Couldn't update comment style"
      // Named rather than a bare "updated": the model sometimes sends fields
      // nobody asked about, and this is where that becomes visible.
      const changed = output?.data?.changed ?? []
      if (!changed.length) return 'Comment style already set that way'
      return `Set ${changed.map(describeChange).join(', ')}`
    }
    case 'set_daily_comment_limit': {
      const limit = input?.limit
      if (running) return 'Changing the daily limit'
      return failed
        ? "Couldn't change the daily limit"
        : `Daily limit set to ${limit}`
    }
    case 'update_keywords': {
      if (running) return 'Updating your keywords'
      if (failed) return "Couldn't update your keywords"
      return describeListChange(output, 'keywords')
    }
    case 'update_monitored_creators': {
      if (running) return 'Updating who you follow'
      if (failed) return "Couldn't update who you follow"
      return describeListChange(output, 'creators')
    }
    case 'update_post_filters': {
      if (running) return 'Updating what it comments on'
      if (failed) return "Couldn't update the filters"
      const parts = [
        ...(output?.data?.changed ?? []).map(describeFilter),
        ...(output?.data?.lists ?? []).map(describeFilterList),
      ]
      if (!parts.length) return 'Filters already set that way'
      return `Now ${parts.join(', ')}`
    }
    case 'update_x_search': {
      if (running) return 'Updating what it searches on X'
      if (failed) return "Couldn't update the X search"
      const parts = (output?.data?.lists ?? []).map(describeFilterList)
      if (!parts.length) return 'X search already set that way'
      return `Now ${parts.join(', ')}`
    }
    case 'update_posting_schedule': {
      if (running) return 'Updating your posting schedule'
      if (failed) return "Couldn't update the posting schedule"
      const changed = output?.data?.changed ?? []
      if (!changed.length) return 'Schedule already set that way'
      return `Set ${changed.map(describeSchedule).join(', ')}`
    }
    case 'set_active_window': {
      const on = output?.data?.enabled
      if (running) return on ? 'Turning the active window on' : 'Turning the active window off'
      if (failed) return "Couldn't change the active window"
      if (output?.data?.alreadySet) return 'Active window already set that way'
      return on
        ? 'Will comment around each of your posts'
        : 'Stopped commenting around your posts'
    }
    case 'edit_pending_comment': {
      if (running) return 'Rewriting the comment'
      return failed ? "Couldn't rewrite the comment" : 'Rewrote the comment'
    }
    case 'unapprove_comment': {
      if (running) return 'Taking the comment out of the queue'
      return failed
        ? "Couldn't cancel the comment"
        : 'Cancelled it — back to waiting for approval'
    }
    case 'reschedule_comment': {
      if (running) return 'Moving the comment'
      if (failed) return "Couldn't reschedule the comment"
      const at = output?.data?.scheduledAt
      return at ? `Moved to ${describeWhen(at)}` : 'Rescheduled the comment'
    }
    case 'approve_post': {
      if (running) return 'Approving the post'
      if (failed) return "Couldn't approve the post"
      const when = output?.data?.scheduledFor
      return when
        ? `Approved — goes out ${describeWhen(when)}`
        : 'Approved the post'
    }
    case 'approve_all_pending_comments': {
      if (running) return 'Queueing the comments'
      if (failed) return "Couldn't queue the comments"
      const n = output?.data?.approved ?? 0
      return `Queued ${n} comment${n === 1 ? '' : 's'}`
    }
    case 'generate_calendar': {
      if (running) return 'Starting the drafts'
      if (failed) return "Couldn't start drafting"
      const n = output?.data?.posts ?? 0
      return `Drafting ${n} post${n === 1 ? '' : 's'} — this takes a few minutes`
    }
    case 'edit_post_text': {
      if (running) return 'Rewriting the post'
      return failed ? "Couldn't rewrite the post" : 'Rewrote the post'
    }
    case 'update_voice': {
      if (running) return 'Adjusting how it writes'
      if (failed) return "Couldn't adjust your writing voice"
      // A question came back instead of a change, and the agent relays it —
      // calling that "updated" would contradict the message beside it.
      return output?.data?.updated === false
        ? 'Needs to know more first'
        : 'Updated your writing voice'
    }
    case 'add_creator': {
      if (running) return 'Adding the creator'
      if (failed) return "Couldn't add that creator"
      const who = output?.data?.name
      return who ? `Now following ${who}` : 'Added the creator'
    }
    case 'draft_post': {
      if (running) return 'Starting the draft'
      if (failed) return "Couldn't start the draft"
      return 'Writing it now — this takes a minute or two'
    }
    case 'pause_agent': {
      const who = describeAgent(input?.agent)
      if (running) return `Pausing ${who}`
      return failed ? `Couldn't pause ${who}` : `Paused ${who}`
    }
    case 'resume_agent': {
      const who = describeAgent(input?.agent)
      if (running) return `Starting ${who}`
      return failed ? `Couldn't start ${who}` : `Started ${who}`
    }
    default:
      // A tool added on the backend still renders something sane here rather
      // than nothing, which is what makes shipping one not a frontend task.
      return toolName.replace(/_/g, ' ')
  }
}

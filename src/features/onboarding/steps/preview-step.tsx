'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  MessageSquare,
  PenLine,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { usePostHog } from 'posthog-js/react'
import { toast } from 'sonner'
import { useOnboarding } from '@/stores/onboarding.store'
import { useProfileStore } from '@/stores/profile.store'
import { UserSubscriptionStatus } from '@/features/auth/interface/user.interface'
import {
  useGetUserQuery,
  useUpdateOnboardingStatus,
} from '@/features/auth/query/user.query'
import { useGetAllProfileQuery } from '@/features/users/query/profile.query'
import { publishPreviewComments } from '../api/preview.api'
import { PreviewDrafts } from '../components/preview-drafts'
import { PreviewFeed, type PreviewMode } from '../components/preview-feed'
import { PreviewPost } from '../components/preview-post'
import { useDerivationStatus } from '../hooks/useDeriveOnboardingSettings'
import { useExtensionGuard } from '../hooks/useExtensionGuard'
import { usePreviewRun } from '../hooks/usePreviewRun'
import { useTrackStepView } from '../hooks/useTrackStepView'
import { OnboardingCard } from '../onboarding-card'
import { getStepNav } from '../onboarding-flow'
import { OnboardingNavigation } from '../onboarding-navigation'

/**
 * A thin sample is common and not a defect - a few keywords will not always
 * turn up much worth replying to. Saying so plainly beats dressing up two weak
 * drafts as a good result, which the user can see through anyway.
 */
const THIN_DAY_THRESHOLD = 2

function toneSubject(wantsComment: boolean, wantsPost: boolean): string {
  if (wantsComment && wantsPost) return 'comments and posts'
  return wantsPost ? 'posts' : 'comments'
}

/**
 * Three different objections this screen invites, answered as one: the writing
 * does not sound like them, the posts came back in a language they do not work
 * in, or from a part of the world they do not sell to. All three read as "this
 * is not for me" and all three are a setting away.
 *
 * Language and region are targeting rather than voice - they decide which posts
 * get found - so they are only worth raising with someone whose agent searches.
 * A posting-only run has nothing to search and would just be told to go and fix
 * something that does not apply to it.
 */
function toneNote(wantsComment: boolean, wantsPost: boolean): string {
  if (wantsComment) {
    return 'Not quite your voice, or the wrong language or region? You can customise all of it later in the dashboard: tone, length, emojis, what to avoid, and which languages and regions it searches.'
  }
  return `Not quite your voice? You can customise how your ${toneSubject(
    wantsComment,
    wantsPost
  )} sound later in the dashboard: tone, length, emojis, and what to avoid.`
}

function previewCopy(opts: {
  wantsComment: boolean
  wantsPost: boolean
  running: boolean
  /** Targeting is still being derived; nothing has been searched yet. */
  preparing: boolean
  commentEmpty: boolean
  searchFailed: boolean
  setupFailed: boolean
  needsReconnect: boolean
  mode: PreviewMode
  /** How many posts the run read and turned down, when it got that far. */
  skippedCount: number
  /** False while the drafts are a sample the user cannot act on yet. */
  canPublish: boolean
}) {
  const {
    wantsComment,
    wantsPost,
    running,
    preparing,
    commentEmpty,
    searchFailed,
    setupFailed,
    needsReconnect,
    mode,
    skippedCount,
    canPublish,
  } = opts

  if (preparing) {
    return {
      title: 'Setting your agent up',
      description:
        'It is reading your profile to work out what to look for. The search starts the moment it has that.',
    }
  }

  if (running) {
    if (wantsComment && wantsPost) {
      return {
        title: 'Your agent is at work',
        description:
          'Commenting and posting are running in the background. You can continue anytime.',
      }
    }
    if (wantsPost) {
      return {
        title: 'Writing a post in your voice',
        description:
          'This keeps going in the background. You can continue anytime.',
      }
    }
    return {
      title: 'Finding posts to comment on',
      description:
        'Your agent is reading LinkedIn right now and picking out what it would reply to. You can continue anytime.',
    }
  }

  if (needsReconnect) {
    return {
      title: 'One thing left to fix',
      description:
        'LinkedIn signed your connection out, so the agent cannot search yet. Reconnecting takes a few seconds.',
    }
  }

  // Distinct from a failed search on purpose: nothing was saved here, so the
  // usual reassurance that "the agent runs on its own every day" would be a
  // lie - there is no targeting for it to run against.
  if (setupFailed) {
    return {
      title: 'We could not finish setting your agent up',
      description:
        'Working out what to look for did not complete, so the search never started. You can set your topics yourself from the dashboard in under a minute.',
    }
  }

  // Never phrased as a verdict on their topics: the search did not happen, so
  // the agent has not formed an opinion about anything yet.
  if (searchFailed) {
    return {
      title: 'Your agent is ready to go',
      description:
        'We could not complete the live search this time. Everything you picked is saved, and the agent runs on its own every day.',
    }
  }

  if (commentEmpty) {
    // Naming the number it turned down is the difference between a claim and
    // evidence: "we read 14 and none fit" is the agent exercising judgement,
    // where a bare "nothing found" reads as the search having quietly broken.
    const what = skippedCount
      ? `It read ${skippedCount} post${skippedCount === 1 ? '' : 's'} and ${
          mode === 'sales'
            ? 'none were describing a problem you solve'
            : 'none were worth adding your take to'
        }`
      : mode === 'sales'
        ? 'Nobody it found was worth pitching to'
        : 'Nothing it found was worth replying to'

    if (wantsPost) {
      return {
        title: 'Your agent is set up',
        description: `${what}, so it skipped them. Your post draft is below, and you can widen the keywords once you are in.`,
      }
    }
    return {
      title: 'Your agent is set up',
      description: `${what}, so it skipped them rather than post filler under your name. Your keywords are saved and you can widen them from the dashboard.`,
    }
  }

  if (wantsComment && wantsPost) {
    return {
      title: 'Here is what it found',
      description: canPublish
        ? 'Pick comments to post live, and keep the draft if it sounds like you.'
        : 'These are real posts and real comments, written for you. The draft below is yours too.',
    }
  }
  if (wantsPost) {
    return {
      title: 'A draft in your voice',
      description: 'Keep the draft if it sounds like you.',
    }
  }
  return {
    title: 'Here is what it found',
    description: canPublish
      ? 'Pick the ones you like and we will post them under your name.'
      : 'Real posts, and the comment your agent would leave on each one.',
  }
}

export function PreviewStep() {
  useTrackStepView('preview')
  const { isChecking } = useExtensionGuard()
  const posthog = usePostHog()
  const { data: onboardingData, markStepCompleted } = useOnboarding()
  const activeProfile = useProfileStore((s) => s.activeProfile)
  const { data: profiles } = useGetAllProfileQuery()
  const { data: user } = useGetUserQuery()
  const { updateOnboardingStatusAsync, isUpdatingOnboardingStatus } =
    useUpdateOnboardingStatus()

  const profileId =
    onboardingData.linkedProfileId ??
    activeProfile?._id ??
    profiles?.[profiles.length - 1]?._id

  const capabilities = onboardingData.selectedCapabilities ?? []
  const slug = onboardingData.selectedAgentType ?? ''
  const wantsPost =
    capabilities.includes('post') ||
    (!capabilities.length && slug.includes('posting'))
  const wantsComment =
    capabilities.includes('comment') ||
    (!capabilities.length && !slug.includes('posting'))

  const {
    phase,
    rows,
    notes,
    scrapedCount,
    analysedCount,
    keptCount,
    rejectedCount,
    keyword,
    drafts,
    lastRun,
    agentMode,
    needsReconnect,
    remainingPublishes,
    canRetry,
    start,
    retry,
    reloadResults,
  } = usePreviewRun(profileId)

  const derivation = useDerivationStatus(profileId)

  // The saved setting wins once it has loaded; the wizard's own answer covers
  // the first render, before any results have come back.
  const mode: PreviewMode =
    (agentMode ?? onboardingData.selectedAgentMode) === 'sales'
      ? 'sales'
      : 'branding'

  const [selected, setSelected] = useState<string[]>([])
  const [publishedUrns, setPublishedUrns] = useState<string[]>([])
  const [publishing, setPublishing] = useState(false)

  // Subscribing is what spends the free run, so the start is deferred a tick and
  // cancelled on cleanup: under StrictMode's double-invoke the first attempt is
  // dropped before it opens a connection, leaving exactly one run.
  useEffect(() => {
    if (!profileId || isChecking || !wantsComment) return
    const timer = setTimeout(start, 0)
    return () => clearTimeout(timer)
  }, [profileId, isChecking, start, wantsComment])

  const maxSelectable = useMemo(
    () => (remainingPublishes < 0 ? drafts.length : remainingPublishes),
    [remainingPublishes, drafts.length]
  )

  const preparing = wantsComment && phase === 'preparing'
  const running = wantsComment && (phase === 'searching' || preparing)
  // `phase` covers a stream that died in front of us; `lastRun` covers landing
  // back on a screen whose run failed in an earlier session. Drafts outrank
  // both: having comments in hand is proof the search reached LinkedIn, and
  // "we could not reach LinkedIn" printed above six of them reads as a bug.
  const searchFailed =
    wantsComment &&
    !running &&
    drafts.length === 0 &&
    (phase === 'failed' || !!lastRun?.searchFailed)
  const commentEmpty =
    wantsComment && !running && !searchFailed && drafts.length === 0
  // The feed is the wait, not the result. Once the comments are on screen it
  // is listing the same kept posts a second time, above the drafts that say it
  // better - so it goes, and stays past the run only when there is nothing
  // else to show and the skips are the whole explanation.
  // A setup failure is explained by the card's own copy, and the feed has only
  // search verdicts to offer - all of which would be reporting on a search
  // that never ran.
  const showFeed = !derivation.saveError && (running || drafts.length === 0)
  const thinDay =
    wantsComment &&
    phase === 'done' &&
    drafts.length > 0 &&
    drafts.length <= THIN_DAY_THRESHOLD
  // Free accounts get a sample they cannot post from; the trial is what buys
  // publishing. Paid accounts revisiting this screen keep the old behaviour.
  const locked = maxSelectable === 0
  // Named for where this leads rather than for the click it makes: the trial is
  // two screens on, behind the one question the identity step asks. Anyone
  // already subscribed lands on the dashboard instead, so they get neither.
  const trialIsNext = user?.status === UserSubscriptionStatus.PENDING
  // Only worth saying once there is something on screen it could apply to -
  // it now sits at the very bottom, past the point where an empty run has
  // already explained itself.
  const showTrialNudge =
    locked && wantsComment && phase === 'done' && drafts.length > 0
  // "It does not sound like me" is the objection this screen invites and has no
  // answer to, and someone who reads five comments in a voice they dislike
  // leaves rather than asks. Shown for a posting-only run too, where the drafts
  // that prompt the thought are the post rather than the comments.
  const showToneNote =
    (wantsComment && phase === 'done' && drafts.length > 0) || wantsPost
  const copy = previewCopy({
    wantsComment,
    wantsPost,
    running,
    preparing,
    commentEmpty,
    searchFailed,
    setupFailed: !!derivation.saveError,
    needsReconnect: !running && needsReconnect,
    mode,
    skippedCount: rejectedCount,
    canPublish: !locked,
  })

  const toggle = (activityUrn: string) => {
    setSelected((prev) =>
      prev.includes(activityUrn)
        ? prev.filter((u) => u !== activityUrn)
        : [...prev, activityUrn]
    )
  }

  // "Post them all" is the obvious action and the cap makes it a lie when there
  // are more drafts than publishes left, so it fills up to the limit instead of
  // silently dropping the overflow.
  const selectMax = () => {
    setSelected(
      drafts
        .filter((d) => !publishedUrns.includes(d.activityUrn))
        .slice(0, maxSelectable)
        .map((d) => d.activityUrn)
    )
  }

  const publish = async () => {
    if (!profileId || !selected.length) return
    setPublishing(true)
    try {
      const result = await publishPreviewComments({
        profileId,
        activityUrns: selected,
      })
      const posted = result.results
        .filter((r) => r.published)
        .map((r) => r.activityUrn)
      setPublishedUrns((prev) => [...prev, ...posted])
      setSelected([])

      posthog?.capture('onboarding_preview_published', {
        count: result.publishedCount,
      })

      if (result.publishedCount) {
        toast.success(
          result.publishedCount === 1
            ? 'Your comment is live on LinkedIn.'
            : `${result.publishedCount} comments are live on LinkedIn.`
        )
      }

      const failures = result.results.filter((r) => r.published === false)
      if (failures.length) {
        toast.error(
          failures[0].error ?? 'One comment could not be posted this time.'
        )
      }
      void reloadResults()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'We could not post that just now.'
      )
    } finally {
      setPublishing(false)
    }
  }

  const nextStep =
    getStepNav('/onboarding/preview', 'linkedin').next ?? '/onboarding/identity'

  return (
    <div className='space-y-8'>
      <OnboardingCard title={copy.title} description={copy.description}>
        <div className='space-y-6'>
          {wantsComment && showFeed && (
            <section className='space-y-3'>
              {wantsPost && (
                <div className='flex items-center gap-2'>
                  <MessageSquare className='text-muted-foreground h-4 w-4' />
                  <h3 className='text-sm font-semibold'>Commenting</h3>
                </div>
              )}
              <PreviewFeed
                rows={rows}
                notes={notes}
                keyword={keyword}
                scrapedCount={scrapedCount}
                analysedCount={analysedCount}
                keptCount={keptCount}
                rejectedCount={rejectedCount}
                running={running}
                preparing={preparing}
                derivationPhase={derivation.phase}
                derivedKeywords={derivation.keywords}
                unreachable={searchFailed && !needsReconnect}
                needsReconnect={!running && needsReconnect}
                mode={mode}
                onRetry={canRetry ? retry : undefined}
              />
            </section>
          )}

          {thinDay && (
            <div className='rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30'>
              <p className='text-sm font-medium text-amber-900 dark:text-amber-200'>
                A thin sample
              </p>
              <p className='mt-1 text-sm text-amber-800 dark:text-amber-300'>
                {mode === 'sales'
                  ? 'Only a couple of people in this sample were describing a problem you solve.'
                  : 'Only a couple of posts in this sample were worth adding your take to.'}{' '}
                This run tries a few of your keywords; the daily run works
                through your whole list, which is where it earns its keep.
              </p>
            </div>
          )}

          {wantsComment && phase === 'done' && drafts.length > 0 && (
            <>
              <div className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1'>
                <h3 className='text-sm font-semibold'>
                  {drafts.length} comment{drafts.length === 1 ? '' : 's'} ready
                </h3>
                {!locked && drafts.length > maxSelectable && (
                  <span className='text-muted-foreground text-xs'>
                    {maxSelectable} can go live now — the rest go out on their
                    own once your trial is on
                  </span>
                )}
              </div>
              <PreviewDrafts
                drafts={drafts}
                selected={selected}
                publishedUrns={publishedUrns}
                maxSelectable={maxSelectable}
                publishing={publishing}
                locked={locked}
                onToggle={toggle}
                onSelectMax={selectMax}
                onClearSelection={() => setSelected([])}
                onPublish={publish}
              />
            </>
          )}

          {publishedUrns.length > 0 && (
            <div className='flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300'>
              <CheckCircle2 className='h-4 w-4 shrink-0' />
              That is your agent working. It does this every day once your trial
              is on.
            </div>
          )}

          {wantsPost && (
            <section className='space-y-3'>
              {wantsComment && (
                <div className='flex items-center gap-2'>
                  <PenLine className='text-muted-foreground h-4 w-4' />
                  <h3 className='text-sm font-semibold'>Posting</h3>
                </div>
              )}
              <PreviewPost profileId={profileId} wantsPost={wantsPost} />
            </section>
          )}

          {/*
            Last thing before Continue, after both the comments and the post.
            The ask reads as the conclusion of everything the agent just did
            rather than as a note about one half of it.
          */}
          {showTrialNudge && (
            <div className='border-primary/30 bg-primary/5 rounded-lg border p-4'>
              <div className='flex items-start gap-2.5'>
                <Sparkles className='text-primary mt-0.5 h-4 w-4 shrink-0' />
                <div className='space-y-1'>
                  <p className='text-sm font-medium'>
                    Want this every day?
                  </p>
                  <p className='text-muted-foreground text-sm'>
                    Your agent finds the posts and writes the comments for you.
                  </p>
                </div>
              </div>
            </div>
          )}

          {showToneNote && (
            <p className='text-muted-foreground flex items-start gap-2 text-xs'>
              <SlidersHorizontal className='mt-0.5 h-3.5 w-3.5 shrink-0' />
              <span>{toneNote(wantsComment, wantsPost)}</span>
            </p>
          )}
        </div>

        <OnboardingNavigation
          prevStep='/onboarding/connect-account'
          nextStep={nextStep}
          nextLabel={
            publishedUrns.length
              ? 'Keep it running'
              : trialIsNext
                ? 'Start free trial'
                : 'Continue'
          }
          currentStep='preview'
          loading={isUpdatingOnboardingStatus}
          onNext={async () => {
            markStepCompleted('preview')
            await updateOnboardingStatusAsync({
              status: 'in-progress',
              stepKey: 'identity',
            })
            return true
          }}
        />
      </OnboardingCard>
    </div>
  )
}

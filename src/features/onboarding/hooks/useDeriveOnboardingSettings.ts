import { useCallback, useEffect, useState } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useOnboarding } from '@/stores/onboarding.store'
import { CommentLengthEnum } from '@/features/settings/enum/setting.enum'
import {
  createOrUpdateSalesSetting,
  extractFromWebsite,
} from '@/features/linkedin-sales/api/sales.api'
import { ProfileQueryEnum } from '@/features/users/query/profile.query'
import {
  analyzeOnboardingProfile,
  createOnboardingCommentSetting,
  createOnboardingPostSetting,
  refineOnboardingKeywords,
} from '../api/onboarding.api'

const COMMENTS_PER_DAY = 10
const MAX_KEYWORDS = 6

export type DerivationPhase = 'idle' | 'reading' | 'checking' | 'ready'

interface Seed {
  keywords: string[]
  aboutProfile: string
  productDescription: string
  painPoints: string[]
  valuePropositions: string[]
  suggestedJobTitles: string[]
}

interface DerivationState {
  phase: DerivationPhase
  keywords: string[]
  seed: Promise<Seed> | null
  refine: Promise<string[]> | null
  /** Present once the connect step has handed the save off; awaited downstream. */
  save: Promise<void> | null
  saved: boolean
  saveError: Error | null
}

/**
 * Kept at module scope, keyed by profile, because two screens share one piece
 * of work. The connect step starts it and hands off without waiting; the
 * preview step waits on it and narrates it. Hook-local refs cannot span that,
 * and the alternative - holding Continue until a LinkedIn read and two LLM
 * calls finish - is a spinner with nothing to explain it on the one screen
 * where the user has nothing else to look at.
 */
const states = new Map<string, DerivationState>()
const listeners = new Map<string, Set<() => void>>()

const EMPTY: DerivationState = {
  phase: 'idle',
  keywords: [],
  seed: null,
  refine: null,
  save: null,
  saved: false,
  saveError: null,
}

function stateOf(profileId: string): DerivationState {
  const existing = states.get(profileId)
  if (existing) return existing
  const created: DerivationState = { ...EMPTY, keywords: [] }
  states.set(profileId, created)
  return created
}

function patch(profileId: string, update: Partial<DerivationState>) {
  Object.assign(stateOf(profileId), update)
  listeners.get(profileId)?.forEach((fn) => fn())
}

function useDerivationState(profileId: string | undefined): DerivationState {
  const [, rerender] = useState(0)

  useEffect(() => {
    if (!profileId) return
    const onChange = () => rerender((n) => n + 1)
    let set = listeners.get(profileId)
    if (!set) {
      set = new Set()
      listeners.set(profileId, set)
    }
    set.add(onChange)
    return () => {
      set.delete(onChange)
    }
  }, [profileId])

  return profileId ? stateOf(profileId) : EMPTY
}

/**
 * What the preview step reads to narrate the setup it is waiting on.
 *
 * A page reload lands here with no module state and settings already written
 * in a previous session, which is why `pending` is false when nothing was
 * ever started: there is no work to wait for, not work of unknown status.
 */
export function useDerivationStatus(profileId: string | undefined) {
  const state = useDerivationState(profileId)
  return {
    phase: state.phase,
    keywords: state.keywords,
    saveError: state.saveError,
    pending: !!state.save && !state.saved && !state.saveError,
  }
}

/**
 * Resolves once this profile's settings are written, so the preview run does
 * not search on targeting that does not exist yet. Rejects if the save failed,
 * which the preview step turns into a visible dead end rather than an empty
 * result the user would read as a verdict on their profile.
 */
export function awaitSettingsSaved(profileId: string): Promise<void> {
  return states.get(profileId)?.save ?? Promise.resolve()
}

/**
 * Works out targeting and comment style from the profile the user just
 * connected, replacing the two forms that used to ask for them.
 *
 * LinkedIn only. Everything here starts from a LinkedIn profile read, and X
 * still asks for both on its own steps, so there is nothing to derive and
 * writing anything would land on top of answers the user has yet to give.
 *
 * Deliberately split in two. `start` runs on link so the work happens while
 * the user is still on the confirmation, and `saveInBackground` hands the
 * write off without blocking navigation - keyword validation searches LinkedIn
 * for real and can take a minute, which is far too long to hold Continue for.
 * Whatever it finds is written afterwards, since the scrape does not run until
 * that night anyway.
 */
export function useDeriveOnboardingSettings() {
  const queryClient = useQueryClient()
  const { data: onboardingData, updateData } = useOnboarding()

  const isSales = onboardingData.selectedAgentMode === 'sales'
  const mode = isSales ? 'sales' : 'branding'
  const websiteUrl = onboardingData.salesSetting.websiteUrl

  const start = useCallback(
    (profileId: string) => {
      const state = stateOf(profileId)
      if (state.seed) return
      patch(profileId, { phase: 'reading' })

      const seed = (async () => {
        const [profile, site] = await Promise.all([
          analyzeOnboardingProfile({ profileId, mode }).catch(() => null),
          isSales && websiteUrl
            ? extractFromWebsite(websiteUrl).catch(() => null)
            : Promise.resolve(null),
        ])

        // The site says what they sell, the profile only says who they are. For
        // sales that ordering matters, so site keywords win when we have them.
        const resolved: Seed = {
          keywords: (site?.keywords?.length
            ? site.keywords
            : (profile?.keywords ?? [])
          ).slice(0, MAX_KEYWORDS),
          aboutProfile: profile?.aboutProfile ?? '',
          productDescription: site?.productDescription ?? '',
          painPoints: site?.painPoints?.slice(0, 6) ?? [],
          valuePropositions: site?.valuePropositions?.slice(0, 5) ?? [],
          suggestedJobTitles: site?.suggestedJobTitles?.slice(0, 6) ?? [],
        }

        patch(profileId, {
          keywords: resolved.keywords,
          phase: resolved.keywords.length ? 'checking' : 'ready',
        })

        if (resolved.keywords.length) {
          const refine = refineOnboardingKeywords({
            profileId,
            existing: resolved.keywords,
            mode,
          })
            .then((res) => res.keywords?.slice(0, MAX_KEYWORDS) ?? [])
            .catch(() => [])
            .then((refined) => {
              patch(profileId, {
                phase: 'ready',
                ...(refined.length && { keywords: refined }),
              })
              return refined
            })
          patch(profileId, { refine })
        }

        return resolved
      })()

      patch(profileId, { seed })
    },
    [isSales, mode, websiteUrl]
  )

  const saveTargeting = useCallback(
    async (profileId: string, seed: Seed, terms: string[]) => {
      if (isSales) {
        await createOrUpdateSalesSetting({
          profileId,
          data: {
            websiteUrl,
            productDescription: seed.productDescription,
            painPoints: seed.painPoints,
            valuePropositions: seed.valuePropositions,
            pitchIntensity: onboardingData.salesSetting.pitchIntensity,
            matchMode: onboardingData.salesSetting.matchMode,
            competitorNames: [],
            suggestedJobTitles: seed.suggestedJobTitles,
            ...(terms.length && { keywordsToTarget: terms }),
          },
        })
        return
      }
      await createOnboardingPostSetting({
        profileId,
        data: {
          keywordsToTarget: terms,
          authorTitles: [],
          skipHiringPosts: true,
          skipJobUpdatePosts: true,
        },
      })
    },
    [isSales, onboardingData.salesSetting, websiteUrl]
  )

  const run = useCallback(
    async (profileId: string) => {
      if (!stateOf(profileId).seed) start(profileId)
      const seed = await stateOf(profileId).seed!
      const terms = stateOf(profileId).keywords.length
        ? stateOf(profileId).keywords
        : seed.keywords

      const aboutProfile = isSales
        ? seed.productDescription || seed.aboutProfile
        : seed.aboutProfile

      await saveTargeting(profileId, seed, terms)

      // Also starts the scrape job, so it has to run after targeting is saved.
      await createOnboardingCommentSetting({
        profileId,
        data: {
          aboutProfile,
          length: CommentLengthEnum.MEDIUM,
          commentsPerDay: COMMENTS_PER_DAY,
          turnOnEmoji: true,
          turnOnExclamations: true,
        },
      })

      invalidateProfiles(queryClient)

      stateOf(profileId)
        .refine?.then((refined) => {
          if (!refined.length || sameSet(refined, terms)) return
          return saveTargeting(profileId, seed, refined)
        })
        .catch(() => {})

      updateData({
        scrapeSetting: {
          ...onboardingData.scrapeSetting,
          keywordsToTarget: terms,
        },
        commentSetting: { ...onboardingData.commentSetting, aboutProfile },
        salesSetting: {
          ...onboardingData.salesSetting,
          productDescription: seed.productDescription,
          painPoints: seed.painPoints,
          valuePropositions: seed.valuePropositions,
          suggestedJobTitles: seed.suggestedJobTitles,
          keywordsToTarget: terms,
        },
      })
    },
    [
      isSales,
      onboardingData.commentSetting,
      onboardingData.salesSetting,
      onboardingData.scrapeSetting,
      queryClient,
      saveTargeting,
      start,
      updateData,
    ]
  )

  /**
   * Starts the write and returns immediately. The rejection is stored rather
   * than thrown, so nothing here surfaces as an unhandled promise - the screen
   * that waits on it is the one that reports it.
   */
  const saveInBackground = useCallback(
    (profileId: string) => {
      const existing = stateOf(profileId)
      if (existing.save) return existing.save

      const save = run(profileId).then(
        () => {
          patch(profileId, { saved: true })
        },
        (error: unknown) => {
          const wrapped =
            error instanceof Error ? error : new Error(String(error))
          patch(profileId, { saveError: wrapped })
          throw wrapped
        }
      )
      // A rejection nobody has attached to yet is an unhandled rejection the
      // moment it settles; the stored promise is still the one awaited later.
      save.catch(() => {})
      patch(profileId, { save })
      return save
    },
    [run]
  )

  return { start, saveInBackground }
}

function invalidateProfiles(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    queryKey: [ProfileQueryEnum.GET_ALL_PROFILE],
    refetchType: 'active',
  })
}

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')

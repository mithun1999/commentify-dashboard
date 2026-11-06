import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AgentType } from '@/features/auth/interface/user.interface'

export type OnboardingPlatform = 'linkedin' | 'twitter'

export interface OnboardingSalesSetting {
  websiteUrl: string
  productDescription: string
  painPoints: string[]
  valuePropositions: string[]
  pitchIntensity: 'subtle' | 'moderate' | 'direct'
  matchMode: 'strict' | 'flexible'
  competitorNames: string[]
  suggestedJobTitles: string[]
  keywordsToTarget?: string[]
}

export interface OnboardingData {
  isLinkedInConnected: boolean
  /** Platform chosen in the platform-first picker. */
  selectedPlatform: OnboardingPlatform | null
  /** Capabilities the user wants on that platform (e.g. ['comment','post']). */
  selectedCapabilities: AgentType[]
  /**
   * Primary agent slug, derived from platform + capabilities (commenting wins
   * when both are selected). Kept for back-compat with existing step logic.
   */
  selectedAgentType: string | null
  selectedAgentMode: 'branding' | 'sales' | null
  linkedProfileId: string | null
  userProfile: {
    name: string
    title: string
    avatar?: string
  } | null
  scrapeSetting: {
    keywordsToTarget: string[]
    commentsPerDay: number
    authorTitles: string[]
    geography: string
    autoApprove: boolean
  }
  commentSetting: {
    aboutProfile: string
    additionalRules: string
    useEmojis: boolean
    useExclamations: boolean
    commentLength: string
  }
  salesSetting: OnboardingSalesSetting
}

const defaultOnboardingData: OnboardingData = {
  isLinkedInConnected: false,
  selectedPlatform: null,
  selectedCapabilities: [],
  selectedAgentType: null,
  selectedAgentMode: null,
  linkedProfileId: null,
  userProfile: null,
  scrapeSetting: {
    keywordsToTarget: [],
    commentsPerDay: 10,
    authorTitles: [],
    geography: 'global',
    autoApprove: false,
  },
  commentSetting: {
    aboutProfile: '',
    additionalRules: '',
    useEmojis: true,
    useExclamations: true,
    commentLength: 'medium',
  },
  salesSetting: {
    websiteUrl: '',
    productDescription: '',
    painPoints: [],
    valuePropositions: [],
    pitchIntensity: 'moderate',
    matchMode: 'flexible',
    competitorNames: [],
    suggestedJobTitles: [],
  },
}

interface OnboardingStoreState {
  data: OnboardingData
  completedSteps: string[]
  /** The account these answers belong to; one browser can sign in to several. */
  ownerId: string | null
  updateData: (newData: Partial<OnboardingData>) => void
  resetData: () => void
  claimFor: (userId: string) => void
  markStepCompleted: (step: string) => void
  removeCompletedStep: (step: string) => void
  isStepCompleted: (step: string) => boolean
}

export const useOnboardingStore = create<OnboardingStoreState>()(
  persist(
    (set, get) => ({
      data: defaultOnboardingData,
      completedSteps: [],
      ownerId: null,
      updateData: (newData) =>
        set((state) => ({
          data: {
            ...state.data,
            ...newData,
          },
        })),
      resetData: () => set({ data: defaultOnboardingData, completedSteps: [] }),
      // Keyed on who signs in, not on signing out: the server keeps only the
      // agent slug, so someone who leaves mid-setup and comes back still needs
      // the rest of their picks. No owner means saved before this was tracked,
      // and nothing says that was someone else.
      claimFor: (userId) => {
        const { ownerId, resetData } = get()
        if (ownerId === userId) return
        if (ownerId) resetData()
        set({ ownerId: userId })
      },
      markStepCompleted: (step: string) => {
        const { completedSteps } = get()
        if (!completedSteps.includes(step)) {
          set({ completedSteps: [...completedSteps, step] })
        }
      },
      removeCompletedStep: (step: string) => {
        const { completedSteps } = get()
        set({ completedSteps: completedSteps.filter((s) => s !== step) })
      },
      isStepCompleted: (step: string) => get().completedSteps.includes(step),
    }),
    {
      name: 'commentify-onboarding',
      version: 3,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as OnboardingStoreState
        if (version === 1) {
          state.data = {
            ...state.data,
            selectedAgentMode: null,
            salesSetting: defaultOnboardingData.salesSetting,
          }
        }
        if (version < 3) {
          // Backfill platform-first fields from the legacy single agent slug.
          const slug = state.data?.selectedAgentType
          state.data = {
            ...state.data,
            selectedPlatform:
              state.data?.selectedPlatform ??
              (slug
                ? slug.startsWith('twitter')
                  ? 'twitter'
                  : 'linkedin'
                : null),
            selectedCapabilities:
              state.data?.selectedCapabilities ??
              (slug ? [slug.includes('posting') ? 'post' : 'comment'] : []),
          }
        }
        return state
      },
    }
  )
)

export function useOnboarding() {
  const data = useOnboardingStore((s) => s.data)
  const updateData = useOnboardingStore((s) => s.updateData)
  const resetData = useOnboardingStore((s) => s.resetData)
  const completedSteps = useOnboardingStore((s) => s.completedSteps)
  const markStepCompleted = useOnboardingStore((s) => s.markStepCompleted)
  const removeCompletedStep = useOnboardingStore((s) => s.removeCompletedStep)
  const isStepCompleted = useOnboardingStore((s) => s.isStepCompleted)

  return {
    data,
    updateData,
    resetData,
    completedSteps,
    markStepCompleted,
    removeCompletedStep,
    isStepCompleted,
  }
}

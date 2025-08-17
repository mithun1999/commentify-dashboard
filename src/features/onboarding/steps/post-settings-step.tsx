'use client'

import { useState } from 'react'
import {
  Hash,
  Info,
  PlusCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  ScanEye,
  X,
  CircleSlash,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { OnboardingCard } from '../onboarding-card'
import { OnboardingNavigation } from '../onboarding-navigation'

const authorTitlesList = ['Founder', 'CEO', 'CTO', 'CMO', 'VP', 'Director']

export function PostSettingsStep() {
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([
    'AI',
    'SaaS',
  ])
  const [showCustomKeywordInput, setShowCustomKeywordInput] = useState(false)
  const [customKeyword, setCustomKeyword] = useState('')
  const [customKeywords, setCustomKeywords] = useState<string[]>([])
  const [showCustomTitleInput, setShowCustomTitleInput] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customTitles, setCustomTitles] = useState<string[]>([])
  const [isEngagementExpanded, setIsEngagementExpanded] = useState(false)
  const [skipHiringPosts, setSkipHiringPosts] = useState(true)
  const [skipJobUpdatePosts, setSkipJobUpdatePosts] = useState(true)
  const [authorTitles, setAuthorTitles] = useState<string[]>([])

  const predefinedKeywords = [
    'AI',
    'SaaS',
    'Startup',
    'Marketing',
    'Sales',
    'Leadership',
    'Finance',
    'Operations',
    'Growth',
  ]

  const allKeywords = [...predefinedKeywords, ...customKeywords]
  const allTitles = [...authorTitlesList, ...customTitles]

  // Check if "All" is selected (when no specific titles are selected)
  const isAllSelected = authorTitles.length === 0

  // Keyword functions (unchanged)
  const handleKeywordSelect = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      setSelectedKeywords(selectedKeywords.filter((k) => k !== keyword))
    } else if (selectedKeywords.length < 6) {
      setSelectedKeywords([...selectedKeywords, keyword])
    }
  }

  const handleKeywordOtherClick = () => {
    setShowCustomKeywordInput(true)
  }

  const handleCustomKeywordSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const trimmedKeyword = customKeyword.trim()
      if (
        trimmedKeyword &&
        !allKeywords.includes(trimmedKeyword) &&
        selectedKeywords.length < 6
      ) {
        setCustomKeywords([...customKeywords, trimmedKeyword])
        setSelectedKeywords([...selectedKeywords, trimmedKeyword])
      }
      setCustomKeyword('')
      setShowCustomKeywordInput(false)
    }
  }

  // Author Title functions
  const toggleTitle = (title: string) => {
    const isSelected = authorTitles.includes(title)
    if (!isSelected && authorTitles.length >= 3) return
    const updated = isSelected
      ? authorTitles.filter((t) => t !== title)
      : [...authorTitles, title]
    setAuthorTitles(updated)
  }

  const toggleAll = () => {
    // If "All" is currently selected (no titles), do nothing
    // If specific titles are selected, deselect all of them (which selects "All")
    if (authorTitles.length > 0) {
      setAuthorTitles([])
    }
  }

  const handleTitleOtherClick = () => {
    if (authorTitles.length >= 3) return
    setShowCustomTitleInput(true)
  }

  const handleCustomTitleSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const trimmedTitle = customTitle.trim()
      if (trimmedTitle && !allTitles.includes(trimmedTitle)) {
        setCustomTitles([...customTitles, trimmedTitle])
        setAuthorTitles([...authorTitles, trimmedTitle])
      }
      setCustomTitle('')
      setShowCustomTitleInput(false)
    }
  }

  // no geography in onboarding step; replaced with engagement + skip options

  return (
    <OnboardingCard
      title='Choose posts that matter'
      description='We’ll only comment on posts that match your interests.'
    >
      {/* Keywords Section */}
      <div className='mb-6'>
        <div className='mb-4 flex items-center gap-x-6'>
          <div className='flex items-center gap-2'>
            <Hash className='text-muted-foreground h-4 w-4' />
            <span className='text-foreground font-semibold'>
              Target Keywords (Choose up to 6)
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className='border-border flex h-4 w-4 cursor-help items-center justify-center rounded-full border'>
                    <Info className='text-muted-foreground h-3 w-3' />
                  </div>
                </TooltipTrigger>
                <TooltipContent side='right' className='max-w-xs'>
                  <p>
                    Select keywords related to your industry or interests to
                    find relevant posts for automated commenting
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className='text-muted-foreground text-sm'>
            {selectedKeywords.length}/6 keywords selected
          </p>
        </div>

        <div className='space-y-3'>
          <div className='flex flex-wrap gap-3'>
            {allKeywords.map((keyword) => {
              const isSelected = selectedKeywords.includes(keyword)
              const isDisabled = !isSelected && selectedKeywords.length >= 6

              return (
                <button
                  key={keyword}
                  onClick={() => handleKeywordSelect(keyword)}
                  disabled={isDisabled}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-200 ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-primary'
                      : isDisabled
                        ? 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-50'
                        : 'bg-card border-border text-card-foreground hover:border-primary/30 hover:shadow-sm'
                  }`}
                >
                  <span className='text-sm font-medium'>{keyword}</span>
                  {customKeywords.includes(keyword) && (
                    <button
                      type='button'
                      aria-label={`Remove ${keyword}`}
                      className='text-muted-foreground/80 hover:text-foreground transition'
                      onClick={(e) => {
                        e.stopPropagation()
                        // Remove from custom list
                        setCustomKeywords((prev) =>
                          prev.filter((k) => k !== keyword)
                        )
                        // If selected, also remove from selected keywords
                        if (selectedKeywords.includes(keyword)) {
                          setSelectedKeywords(
                            selectedKeywords.filter((k) => k !== keyword)
                          )
                        }
                      }}
                    >
                      <X className='h-3.5 w-3.5' />
                    </button>
                  )}
                </button>
              )
            })}

            {!showCustomKeywordInput ? (
              <button
                onClick={handleKeywordOtherClick}
                disabled={selectedKeywords.length >= 6}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-200 ${
                  selectedKeywords.length >= 6
                    ? 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-50'
                    : 'bg-card border-border text-card-foreground hover:border-primary/30 hover:shadow-sm'
                }`}
              >
                <span className='flex items-center gap-1 text-sm font-medium'>
                  <PlusCircle className='h-4 w-4' />
                  Other
                </span>
              </button>
            ) : (
              <Input
                placeholder='Enter keyword...'
                value={customKeyword}
                onChange={(e) => setCustomKeyword(e.target.value)}
                onKeyPress={handleCustomKeywordSubmit}
                onBlur={() => setShowCustomKeywordInput(false)}
                autoFocus
                className='h-10 w-32'
              />
            )}
          </div>
        </div>
      </div>

      {/* Author Titles Section */}
      <div className='mb-6 space-y-2'>
        <div className='flex items-center justify-between'>
          <div className='flex w-full items-center gap-x-6'>
            <div className='flex items-center gap-2'>
              <Filter className='text-muted-foreground h-4 w-4' />
              <Label className='text-foreground font-medium'>
                Post Author Titles
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className='border-border flex h-4 w-4 cursor-help items-center justify-center rounded-full border'>
                      <Info className='text-muted-foreground h-3 w-3' />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side='right' className='max-w-xs'>
                    <p>
                      Select titles of authors whose posts
                      <br />
                      you want to engage with
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className='text-muted-foreground text-sm'>
              {!isAllSelected && `${authorTitles.length}/3 titles selected`}
            </p>
          </div>
        </div>

        <div className='mt-4 space-y-3'>
          <div className='flex flex-wrap gap-3'>
            {/* All option */}
            <button
              onClick={toggleAll}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-200 ${
                isAllSelected
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-card border-border text-card-foreground hover:border-primary/30 hover:shadow-sm'
              }`}
            >
              <span className='text-sm font-medium'>All</span>
            </button>

            {allTitles.map((title) => {
              const isSelected = authorTitles.includes(title)
              return (
                <button
                  key={title}
                  onClick={() => toggleTitle(title)}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-200 ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-card border-border text-card-foreground hover:border-primary/30 hover:shadow-sm'
                  }`}
                >
                  <span className='text-sm font-medium'>{title}</span>
                  {customTitles.includes(title) && (
                    <button
                      type='button'
                      aria-label={`Remove ${title}`}
                      className='text-muted-foreground/80 hover:text-foreground transition'
                      onClick={(e) => {
                        e.stopPropagation()
                        // Remove from custom titles list
                        setCustomTitles((prev) =>
                          prev.filter((t) => t !== title)
                        )
                        // If selected, also remove from selected author titles
                        if (authorTitles.includes(title)) {
                          setAuthorTitles(
                            authorTitles.filter((t) => t !== title)
                          )
                        }
                      }}
                    >
                      <X className='h-3.5 w-3.5' />
                    </button>
                  )}
                </button>
              )
            })}

            {!showCustomTitleInput ? (
              <button
                onClick={handleTitleOtherClick}
                disabled={isAllSelected}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all duration-200 ${
                  isAllSelected
                    ? 'bg-muted border-border text-muted-foreground cursor-not-allowed opacity-50'
                    : 'bg-card border-border text-card-foreground hover:border-primary/30 hover:shadow-sm'
                }`}
              >
                <span className='flex items-center gap-1 text-sm font-medium'>
                  <PlusCircle className='h-4 w-4' />
                  Other
                </span>
              </button>
            ) : (
              <Input
                placeholder='Enter title...'
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                onKeyPress={handleCustomTitleSubmit}
                onBlur={() => setShowCustomTitleInput(false)}
                autoFocus
                className='h-10 w-32'
              />
            )}
          </div>
        </div>
      </div>

      {/* Miscellaneous Section */}
      <div className='mb-6 space-y-2'>
        <div
          className='group flex cursor-pointer items-center justify-between'
          onClick={() => setIsEngagementExpanded(!isEngagementExpanded)}
        >
          <div className='flex items-center gap-2'>
            <CircleSlash className='text-muted-foreground h-4 w-4' />
            <Label className='text-foreground cursor-pointer font-medium'>
              Exclusions
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className='border-border flex h-4 w-4 cursor-help items-center justify-center rounded-full border'>
                    <Info className='text-muted-foreground h-3 w-3' />
                  </div>
                </TooltipTrigger>
                <TooltipContent side='right' className='max-w-xs'>
                  <p>
                    Additional settings for post filtering and commenting
                    preferences.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className='text-muted-foreground group-hover:text-foreground flex items-center transition-colors'>
            {isEngagementExpanded ? (
              <ChevronUp className='h-4 w-4' />
            ) : (
              <ChevronDown className='h-4 w-4' />
            )}
          </div>
        </div>

        {isEngagementExpanded && (
          <div className='mt-4 space-y-4'>
            {/* Skip Options */}
            <div className='space-y-4'>
              <div className='flex max-w-xl flex-row items-center justify-between rounded-lg border p-4'>
                <div className='space-y-0.5'>
                  <span className='text-sm font-semibold'>
                    Don’t comment on job openings
                  </span>
                  <p className='text-muted-foreground text-sm'>
                    Exclude from commenting list
                  </p>
                </div>
                <Switch
                  checked={skipHiringPosts}
                  onCheckedChange={setSkipHiringPosts}
                />
              </div>

              <div className='flex max-w-xl flex-row items-center justify-between rounded-lg border p-4'>
                <div className='space-y-0.5'>
                  <span className='text-sm font-semibold'>
                    Don’t comment on “started a new job” updates
                  </span>
                  <p className='text-muted-foreground text-sm'>
                    Exclude from commenting list
                  </p>
                </div>
                <Switch
                  checked={skipJobUpdatePosts}
                  onCheckedChange={setSkipJobUpdatePosts}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <OnboardingNavigation nextStep='/onboarding/comment-settings' />
    </OnboardingCard>
  )
}

import { MAX_AUTHOR_TITLES } from './post-form.schema'

export function isAuthorTitlesFull(selected: string[]): boolean {
  return selected.length >= MAX_AUTHOR_TITLES
}

// Selected chips stay clickable so the user can deselect, including a profile
// saved with more than the cap before it existed.
export function isTitleChipDisabled(
  title: string,
  selected: string[]
): boolean {
  return !selected.includes(title) && isAuthorTitlesFull(selected)
}

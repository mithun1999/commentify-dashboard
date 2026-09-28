import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Extension messaging used to be duplicated here and in `@/utils/utils`, with
// different surfaces importing different copies. `@/lib/extension` is the one
// implementation now; these re-exports keep existing import paths working.
export {
  getProfileDetailsFromExtension,
  linkLinkedInProfileFromExtension,
} from '@/lib/extension'

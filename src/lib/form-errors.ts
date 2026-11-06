import type { FieldErrors, FieldValues } from 'react-hook-form'
import { toast } from 'sonner'

const FALLBACK = 'Some fields need fixing before this can be saved.'

/** The first validation message in a react-hook-form errors tree. */
export function firstFormError(errors: unknown): string | undefined {
  if (!errors || typeof errors !== 'object') return undefined
  const { message } = errors as { message?: unknown }
  if (typeof message === 'string' && message) return message
  for (const value of Object.values(errors)) {
    const found = firstFormError(value)
    if (found) return found
  }
  return undefined
}

/**
 * Pass as handleSubmit's second argument. The inline messages sit beside each
 * field, often a long way above the Save button, so without this a blocked
 * save looks like a button that does nothing.
 */
export function toastFormError<T extends FieldValues>(errors: FieldErrors<T>) {
  toast.error(firstFormError(errors) ?? FALLBACK)
}

import { toast } from 'sonner'

export async function copyText(value: string, label = 'Copied') {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(label)
    return true
  } catch {
    toast.error('Could not copy. Select the text and copy it instead.')
    return false
  }
}

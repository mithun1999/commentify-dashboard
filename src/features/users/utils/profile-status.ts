import { ProfileStatusEnum } from '@/features/users/enum/profile.enum'

/**
 * Whether the owner can save agent settings for a profile in this status.
 * NEEDS_ATTENTION counts: it is usually caused by the settings themselves
 * (e.g. `settings-invalid` when no scrape setting exists), so blocking the save
 * would leave the owner with no way out. ACTION_REQUIRED needs a reconnect and
 * DEACTIVATED needs a plan; saving settings fixes neither.
 */
export function canSaveProfileSettings(status?: ProfileStatusEnum | string) {
  return (
    status === ProfileStatusEnum.OK ||
    status === ProfileStatusEnum.NEEDS_ATTENTION
  )
}

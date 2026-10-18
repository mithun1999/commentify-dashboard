import { ProfileStatusEnum } from '@/features/users/enum/profile.enum'

// NEEDS_ATTENTION means the profile's own settings are the problem, so the
// user must be able to save new ones. ACTION_REQUIRED (reconnect) and
// DEACTIVATED (billing) are not fixed by a settings change.
export function canSaveSettings(status?: ProfileStatusEnum): boolean {
  return (
    status === ProfileStatusEnum.OK ||
    status === ProfileStatusEnum.NEEDS_ATTENTION
  )
}

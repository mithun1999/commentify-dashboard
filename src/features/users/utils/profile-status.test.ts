import { describe, expect, it } from 'vitest'
import { ProfileStatusEnum } from '@/features/users/enum/profile.enum'
import { canSaveProfileSettings } from './profile-status'

describe('canSaveProfileSettings', () => {
  it('allows saving for a healthy profile', () => {
    expect(canSaveProfileSettings(ProfileStatusEnum.OK)).toBe(true)
  })

  // A profile flagged settings-invalid can only recover by saving settings.
  it('allows saving while the profile needs attention', () => {
    expect(canSaveProfileSettings(ProfileStatusEnum.NEEDS_ATTENTION)).toBe(true)
  })

  it('blocks saving when the profile needs a reconnect or a plan', () => {
    expect(canSaveProfileSettings(ProfileStatusEnum.ACTION_REQUIRED)).toBe(
      false
    )
    expect(canSaveProfileSettings(ProfileStatusEnum.DEACTIVATED)).toBe(false)
  })

  it('blocks saving when there is no active profile', () => {
    expect(canSaveProfileSettings(undefined)).toBe(false)
  })
})

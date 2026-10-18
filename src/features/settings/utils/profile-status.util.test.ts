import { describe, expect, it } from 'vitest'
import { ProfileStatusEnum } from '@/features/users/enum/profile.enum'
import { canSaveSettings } from './profile-status.util'

describe('canSaveSettings', () => {
  it('allows saving when the profile is OK', () => {
    expect(canSaveSettings(ProfileStatusEnum.OK)).toBe(true)
  })

  it('allows saving when the profile needs attention', () => {
    expect(canSaveSettings(ProfileStatusEnum.NEEDS_ATTENTION)).toBe(true)
  })

  it('blocks saving when action is required', () => {
    expect(canSaveSettings(ProfileStatusEnum.ACTION_REQUIRED)).toBe(false)
  })

  it('blocks saving when the profile is deactivated', () => {
    expect(canSaveSettings(ProfileStatusEnum.DEACTIVATED)).toBe(false)
  })

  it('blocks saving with no active profile', () => {
    expect(canSaveSettings(undefined)).toBe(false)
  })
})

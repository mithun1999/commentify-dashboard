import Cookies from 'js-cookie'
import { SupabaseInstance } from '@/services/supabase.service'
import { Session, isAuthRetryableFetchError } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { AuthEnum } from '../enum/auth.enum'

export async function signInWithPassword(data: {
  email: string
  password: string
}) {
  const supabase = SupabaseInstance.getSupabase()
  const res = await supabase.auth.signInWithPassword(data)
  const session = res?.data?.session
  const error = res?.error
  if (session) {
    Cookies.set(AuthEnum.AUTH_COOKIE_KEY, JSON.stringify(session), {
      expires: 7,
      secure: true,
      sameSite: 'Lax',
    })
  }

  return { session, error }
}

export async function signInWithGoogle() {
  const supabase = SupabaseInstance.getSupabase()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      redirectTo: `${window?.location?.origin}`,
    },
  })
  if (error) {
    toast.error('Tech tango glitch, Retry, please!')
  }
}

export async function signUpWithPassword(payload: {
  firstName: string
  lastName: string
  email: string
  password: string
}) {
  const supabase = SupabaseInstance.getSupabase()
  const { data, error } = await supabase.auth.signUp({
    email: payload?.email,
    password: payload?.password,
    options: {
      data: {
        first_name: payload?.firstName,
        last_name: payload?.lastName,
      },
    },
  })

  if (error || !data?.user?.identities?.length) {
    throw new Error(error?.message || 'Email already exists')
  }

  if (data.session) {
    Cookies.set(AuthEnum.AUTH_COOKIE_KEY, JSON.stringify(data.session), {
      expires: 7,
      secure: true,
      sameSite: 'Lax',
    })
  }

  return data?.user
}

export async function sendPasswordResetLink(email: string) {
  const supabase = SupabaseInstance.getSupabase()
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window?.location?.origin}/update-password`,
  })

  if (error) {
    throw new Error(error?.message || 'Tech tango glitch, Retry, please!')
  }
  return data
}

export async function updatePassword(password: string) {
  const supabase = SupabaseInstance.getSupabase()
  const { data, error } = await supabase.auth.updateUser({ password })
  if (error) {
    throw new Error(error?.message || 'Tech tango glitch, Retry, please!')
  }
  return data?.user
}

export async function signOut() {
  const supabase = SupabaseInstance.getSupabase()
  Cookies.remove(AuthEnum.AUTH_COOKIE_KEY)
  return supabase.auth.signOut()
}

/**
 * The access token to send right now. Read through supabase rather than the
 * store: getSession() refreshes a token that is expired (or about to be) and
 * queues behind the refresh supabase runs when a background tab becomes
 * visible again, so a request fired on refocus never goes out with the stale
 * token the store still holds.
 */
export async function getAuthToken() {
  const supabase = SupabaseInstance.getSupabase()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

let pendingRefresh: Promise<string | null> | null = null

/**
 * Recovers from a 401 on `rejectedToken`. Resolves to a token worth retrying
 * with, or null when the session is gone for good. Throws when supabase could
 * not be reached, so a network blip is never mistaken for a dead session.
 * Concurrent 401s share one refresh: refresh tokens rotate on use.
 */
export function refreshAuthToken(rejectedToken?: string) {
  pendingRefresh ??= (async () => {
    // Another request, or supabase's own refocus refresh, may already have
    // replaced the token this request went out with.
    const current = await getAuthToken()
    if (current && current !== rejectedToken) return current

    const supabase = SupabaseInstance.getSupabase()
    const { data, error } = await supabase.auth.refreshSession()
    if (isAuthRetryableFetchError(error)) throw error
    return data.session?.access_token ?? null
  })().finally(() => {
    pendingRefresh = null
  })
  return pendingRefresh
}

export function getUserId() {
  const session = Cookies.get(AuthEnum.AUTH_COOKIE_KEY)
  if (session) {
    const sessionObj = JSON.parse(session) as Session
    return sessionObj.user?.user_metadata?.userId
  }
}

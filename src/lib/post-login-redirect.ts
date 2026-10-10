const KEY = 'cmfy_post_login_redirect'

/** Same-origin paths only, so a crafted link cannot bounce a fresh login off-site. */
const isLocalPath = (path: string) =>
  path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\')

/**
 * Remember where to go once the user has signed in. Every sign-in path
 * (password, Google's full-page redirect, sign-up) ends on `/` inside the
 * authenticated layout, which takes it from there.
 */
export function rememberPostLoginRedirect(path: string) {
  if (isLocalPath(path)) sessionStorage.setItem(KEY, path)
}

export function takePostLoginRedirect(): string | null {
  const path = sessionStorage.getItem(KEY)
  sessionStorage.removeItem(KEY)
  return path && isLocalPath(path) ? path : null
}

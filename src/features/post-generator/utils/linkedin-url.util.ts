/**
 * Posts carry the activity URN they were published under rather than a URL,
 * so the public permalink has to be rebuilt from the id inside it.
 */
export function linkedinPostUrl(urn: string | null | undefined) {
  if (!urn) return null
  const id = urn.match(/urn:li:(?:activity|share|ugcPost):(\d+)/)?.[1]
  return id
    ? `https://www.linkedin.com/feed/update/urn:li:activity:${id}/`
    : null
}

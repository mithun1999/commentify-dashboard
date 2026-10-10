/**
 * X's length rules, mirrored from the backend (platform/x/x-text.util.ts and
 * x-format.ts) so the editor counts what X and the publisher will count. Kept
 * in step by hand; the backend is the one that refuses.
 */

export type XFormat = 'tweet' | 'thread' | 'long_post'

export const X_POST_LIMIT = 280
export const X_LONG_POST_LIMIT = 4000
export const X_THREAD_MIN_POSTS = 3
export const X_THREAD_MAX_POSTS = 8

const X_URL_WEIGHT = 23

/** twitter-text v3 ranges that weigh 1; anything outside weighs 2. */
const LIGHT_RANGES: Array<[number, number]> = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
]

const URL_RE =
  /\bhttps?:\/\/[^\s<>"]+|\b(?:[a-z0-9-]+\.)+(?:com|io|co|ai|org|net|dev|app|so|me|gg|ly|xyz|tech|info|biz|us|uk|in|de|fr|ca|au|news|blog|page|link|tv|fm|sh)(?:\/[^\s<>"]*)?/gi

const EMOJI_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u

// Not in this project's TS lib yet; every browser the dashboard supports has it.
const IntlWithSegmenter = Intl as unknown as {
  Segmenter?: new (
    locale: string,
    options: { granularity: 'grapheme' }
  ) => { segment(text: string): Iterable<{ segment: string }> }
}
const segmenter = IntlWithSegmenter.Segmenter
  ? new IntlWithSegmenter.Segmenter('en', { granularity: 'grapheme' })
  : null

function graphemes(text: string): string[] {
  if (!segmenter) return Array.from(text)
  return Array.from(segmenter.segment(text), (s) => s.segment)
}

function codePointWeight(cp: number): number {
  for (const [start, end] of LIGHT_RANGES) {
    if (cp >= start && cp <= end) return 1
  }
  return 2
}

function isEmojiGrapheme(g: string): boolean {
  if (!EMOJI_RE.test(g)) return false
  const first = g.codePointAt(0) ?? 0
  return first > 0x2000 || g.includes('️') || g.length > 1
}

function weightOfPlainText(text: string): number {
  let total = 0
  for (const g of graphemes(text)) {
    if (isEmojiGrapheme(g)) {
      total += 2
      continue
    }
    for (const ch of g) total += codePointWeight(ch.codePointAt(0) ?? 0)
  }
  return total
}

/** The length X will count: links 23 each, emoji and CJK 2. */
export function xWeightedLength(text: string): number {
  const normalized = (text ?? '').normalize('NFC')
  let total = 0
  let last = 0
  for (const match of normalized.matchAll(URL_RE)) {
    const raw = match[0]
    const url = raw.replace(/[.,;:!?)\]]+$/, '')
    const start = match.index ?? 0
    total += weightOfPlainText(normalized.slice(last, start))
    total += X_URL_WEIGHT
    total += weightOfPlainText(raw.slice(url.length))
    last = start + raw.length
  }
  total += weightOfPlainText(normalized.slice(last))
  return total
}

const THREAD_SEPARATOR = '\n\n---\n\n'

/** A thread is stored as one text, a line holding only `---` between posts. */
export function splitThread(content: string): string[] {
  return (content ?? '')
    .split(/\n[ \t]*---[ \t]*\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function joinThread(posts: string[]): string {
  return posts
    .map((s) => s.trim())
    .filter(Boolean)
    .join(THREAD_SEPARATOR)
}

export function isXFormat(value: unknown): value is XFormat {
  return value === 'tweet' || value === 'thread' || value === 'long_post'
}

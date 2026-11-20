/**
 * What the preview step's Continue does when saving the person's topics
 * failed.
 *
 * Without topics the agent has nothing to search for, and every daily run
 * ends before it starts. Letting someone start a trial in that state hands
 * them an agent that can never post, with nothing on any later screen to say
 * so. So the button holds: one silent retry first, since most failures are a
 * model call or a request that did not come back, and after that a field to
 * type a few topics into.
 */
export const MAX_TOPICS = 6

export type SetupHoldAction =
  /** Setup is fine; carry on to the next step. */
  | 'proceed'
  /** Try the save again exactly as it was. */
  | 'retry'
  /** The field is showing and empty; say so and stay. */
  | 'ask-for-topics'
  /** Save again with what the person typed. */
  | 'save-typed-topics'

export function setupHoldAction(opts: {
  setupFailed: boolean
  /** True once the retry has failed and the topics field is on screen. */
  askingForTopics: boolean
  topics: string[]
}): SetupHoldAction {
  if (!opts.setupFailed) return 'proceed'
  if (!opts.askingForTopics) return 'retry'
  return opts.topics.length ? 'save-typed-topics' : 'ask-for-topics'
}

/** Commas or new lines, since people type a list either way. */
export function parseTopics(text: string): string[] {
  const seen = new Set<string>()
  const topics: string[] = []
  for (const raw of text.split(/[,\n;]/)) {
    const topic = raw.trim().replace(/\s+/g, ' ')
    const key = topic.toLowerCase()
    if (!topic || seen.has(key)) continue
    seen.add(key)
    topics.push(topic)
  }
  return topics.slice(0, MAX_TOPICS)
}

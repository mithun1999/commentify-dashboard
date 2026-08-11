/**
 * The thread id is minted here rather than by the server so the id is known
 * before the first message is sent — it goes in the URL, and the client cannot
 * learn a server-assigned one mid-stream. ObjectId-shaped because that is what
 * the transcript collection keys on.
 */
export function newConversationId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

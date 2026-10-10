/** The name every client shows the server under. */
export const SERVER_NAME = 'Commentify'

/** Opens Claude's "Add custom connector" dialog already filled in. */
export const claudeInstallUrl = (serverUrl: string) =>
  `https://claude.ai/customize/connectors?modal=add-custom-connector&connectorName=${encodeURIComponent(
    SERVER_NAME
  )}&connectorUrl=${encodeURIComponent(serverUrl)}`

/** Cursor's one-click install: base64 of the server entry. */
export const cursorInstallUrl = (serverUrl: string) =>
  `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(
    SERVER_NAME
  )}&config=${encodeURIComponent(btoa(JSON.stringify({ url: serverUrl })))}`

/** VS Code (GitHub Copilot agent mode) one-click install. */
export const vscodeInstallUrl = (serverUrl: string) =>
  `vscode:mcp/install?${encodeURIComponent(
    JSON.stringify({ name: SERVER_NAME, type: 'http', url: serverUrl })
  )}`

export const claudeCodeCommand = (serverUrl: string) =>
  `claude mcp add --transport http commentify ${serverUrl}`

export const codexCommand = (serverUrl: string) =>
  `codex mcp add commentify --url ${serverUrl}`

export const geminiCommand = (serverUrl: string) =>
  `gemini mcp add --transport http commentify ${serverUrl}`

export const genericConfig = (serverUrl: string) =>
  JSON.stringify({ mcpServers: { commentify: { url: serverUrl } } }, null, 2)

export const EXAMPLE_PROMPTS = [
  "What's scheduled to go out this week on LinkedIn?",
  'Show me the comments waiting for my approval',
  'Approve all my pending comments',
  'Draft a LinkedIn post about what I learned hiring our first salesperson',
  'Pause my commenting agent until Monday',
  'How many comments did the agent post in the last 7 days?',
]

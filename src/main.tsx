import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { AxiosError } from 'axios'
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import * as Sentry from '@sentry/react'
import { PostHogProvider } from 'posthog-js/react'
import { toast } from 'sonner'
import { handleServerError } from '@/utils/handle-server-error'
import { envConfig } from './config/env.config'
import { FontProvider } from './context/font-context'
import { ThemeProvider } from './context/theme-context'
import { signOut } from './features/auth/utils/auth.util'
import {
  buildQueryErrorToastId,
  getReadableErrorMessage,
  isSessionExpiredError,
  queryHasCachedData,
  shouldSuppressGlobalErrorNotice,
} from './lib/connection-recovery'
// Add this import
import './index.css'
import './features/linkedin-commenting/register'
import './features/twitter-commenting/register'
import { routeTree } from './routeTree.gen'

Sentry.init({
  dsn: envConfig.sentryDsn,
  sendDefaultPii: true,
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
  ],
})

// Read optional PostHog bootstrap identifiers from URL hash for cross-origin session linking
const hashParams = new URLSearchParams(window.location.hash.substring(1))
const distinctId = hashParams.get('distinct_id')
const sessionId = hashParams.get('session_id')
const posthogBootstrapOptions =
  sessionId || distinctId
    ? {
        bootstrap: {
          ...(sessionId ? { sessionID: sessionId } : {}),
          ...(distinctId ? { distinctID: distinctId } : {}),
        },
      }
    : {}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (failureCount >= 0 && import.meta.env.DEV) return false
        if (failureCount > 3 && import.meta.env.PROD) return false

        return !(
          error instanceof AxiosError &&
          [401, 403].includes(error.response?.status ?? 0)
        )
      },
      refetchOnWindowFocus: import.meta.env.PROD,
      staleTime: 10 * 1000, // 10s
    },
  },
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      // Mutations that render their own error UI (link/reconnect prompt,
      // disconnect dialog) opt out the same way queries do.
      if (shouldSuppressGlobalErrorNotice(mutation)) return
      handleServerError(error)

      if (error instanceof AxiosError) {
        if (error.response?.status === 304) {
          toast.error('Content not modified!')
        }
      }
    },
  }),
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Session policy is unchanged by this workstream: 401 still signs the
      // user out and redirects to sign-in.
      if (isSessionExpiredError(error)) {
        toast.error('Session expired!')
        signOut()
        const redirect = `${router.history.location.href}`
        router.navigate({ to: '/sign-in', search: { redirect } })
        return
      }

      // No more blanket navigation to /500 for an arbitrary query failure —
      // that could fire for a background stats/settings refresh and yank the
      // user off whatever they were doing. Components with their own error
      // state (e.g. the profile list) opt out via query meta so they are not
      // double-notified.
      if (shouldSuppressGlobalErrorNotice(query)) return

      toast.error(getReadableErrorMessage(error), {
        // Stable id so sonner updates one toast per query instead of
        // stacking a new one on every retry/background refetch.
        id: buildQueryErrorToastId(query.queryKey),
        description: queryHasCachedData(query)
          ? 'Showing previously loaded data.'
          : undefined,
        action: {
          label: 'Retry',
          onClick: () => {
            // Retries the failed read itself, not a mutation.
            query.fetch().catch(() => {
              // Surfaced again through this same handler on the next failure.
            })
          },
        },
      })
    },
  }),
})

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    queryClient,
    auth: {
      isSignedIn: false,
      isSessionLoaded: false,
      session: null,
    },
  },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <PostHogProvider
          apiKey={envConfig.postHogKey}
          options={{
            api_host: envConfig.postHogHost,
            ui_host: 'https://us.posthog.com',
            defaults: '2025-05-24',
            debug: import.meta.env.DEV,
            ...posthogBootstrapOptions,
          }}
        >
          <ThemeProvider defaultTheme='light' storageKey='vite-ui-theme'>
            <FontProvider>
              <RouterProvider router={router} />
            </FontProvider>
          </ThemeProvider>
        </PostHogProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}

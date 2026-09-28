import Constants from 'expo-constants'
import PostHog from 'posthog-react-native'

const projectToken = Constants.expoConfig?.extra?.posthogProjectToken as string | undefined
const host = Constants.expoConfig?.extra?.posthogHost as string | undefined
const isPostHogConfigured = Boolean(projectToken && host)

if (__DEV__ && !projectToken) {
  console.error(
    'EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN is configured',
  )
}

if (__DEV__ && !host) {
  console.error(
    'EXPO_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once EXPO_PUBLIC_POSTHOG_HOST is configured',
  )
}

export const posthog = new PostHog(projectToken as string, {
  host: host as string,
  disabled: !isPostHogConfigured,
  captureAppLifecycleEvents: true,
  errorTracking: {
    autocapture: {
      uncaughtExceptions: true,
      unhandledRejections: true,
      console: [],
    },
  },
  enableSessionReplay: true,
  sessionReplayConfig: {
    maskAllTextInputs: false,
    maskAllImages: false,
    captureLog: true,
    captureNetworkTelemetry: true,
    sampleRate: undefined,
    throttleDelayMs: 1000,
  },
})

export const isPostHogEnabled = isPostHogConfigured
